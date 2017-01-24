#!/usr/bin/env node
/* eslint-disable no-console, func-names, quotes */
const request = require('request');
const cheerio = require('cheerio');
const colors = require('colors');
const clipboardy = require('clipboardy');
const argv = require('yargs')
  .usage('Usage: $0 -s [标题] -o [排序方式] -c [分类] -h [帮助]')
  .options({
    c: {
      default: 0,
      alias: 'cate',
      describe: '在下列分類下搜索:\n0=>全部 1=>其他 2=>动画 3=>漫画 4=>音乐 6=>日剧 7=>RAW ' +
      '9=>游戏 17=>电脑游戏 18=>电视游戏 19=>掌机游戏 20=>网络游戏 21=>游戏周边 31=>季度全集 ' +
      '41=>港台漫画 42=>日文原版 43=>动漫音乐 44=>同人音乐',
      choices: [0, 1, 2, 3, 4, 6, 7, 9, 12, 15, 17, 18, 19, 20, 21, 31, 41, 42, 43, 44],
    },
    o: {
      default: 'date-desc',
      alias: 'order',
      describe: '按下列順序排序',
      choices: ['date-desc', 'date-asc', 'rel'],
    },
    s: {
      alias: 'search',
      describe: '搜索標題',
      demand: true,
    },
  })
  .help('h')
  .alias('h', 'help')
  .argv;


class Dmhy {
  constructor() {
    this.page = 1;
    this.canPrev = false;
    this.canNext = false;
    this.result = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (data) => {
      const msg = data.trim();
      const num = Number(msg);
      if (msg === 'q') {
        process.exit(0);
      } else if (msg === 'p') {
        this.prevSearch();
      } else if (msg === 'n') {
        this.nextSearch();
      } else if (num && num > 0 && num <= this.result.length) {
        clipboardy.write(this.result[num - 1].magnet)
          .then(() => {
            console.log(colors.green('成功复制磁力链接到剪贴板'));
            Dmhy.ask();
          })
          .catch((err) => {
            console.error(err.message);
            process.exit(1);
          });
      } else {
        console.log('不支持此操作，请重新输入');
      }
    });
  }

  search() {
    const url = `http://share.dmhy.org/topics/list/page/${this.page}?keyword=${encodeURIComponent(argv.s)}&sort_id=${argv.c}&team_id=0&order=${argv.o}`;
    console.log(`\n => searching for ${colors.blue(argv.s)}\n`);
    request(url, (err, res, body) => {
      if (err) {
        console.error(err);
        console.log(colors.red('搜索失败，请重新尝试'));
        process.exit(1);
      }

      if (res.statusCode === 200) {
        const $ = cheerio.load(body);

        const nav = $('a', '.nav_title > .fl ').map(function () {
          return $(this).attr('href');
        });

        const pageResult = [];
        $('tr', 'tbody').each(function () {
          const item = {};
          const tds = $(this).find('td');
          item.magnet = tds.eq(3).children('a').attr('href');
          if (item.magnet) {
            item.pubtime = tds.first().find('span').text();
            item.category = tds.eq(1).text();
            item.tag = tds.eq(2).find('.tag').text();
            item.title = tds.eq(2).children('a').text().trim();
            item.size = tds.eq(4).text();
            item.btnum = tds.eq(5).text();
            item.downum = tds.eq(6).text();
            item.finish = tds.eq(7).text();
            item.publisher = tds.eq(8).text();
            pageResult.push(item);
          }
        });

        pageResult.nav = nav;
        this.result.push(pageResult);
        this.printResult(pageResult);
      }
    });
  }

  prevSearch() {
    if (this.canPrev) {
      this.page -= 1;
      if (this.result[this.page]) {
        return this.printResult(this.result[this.page]);
      }
      // this.page -= 1;
      return this.search();
    }
    console.log(colors.yellow('已经是第一页~\\(≧▽≦)/~啦啦啦'));
    return Dmhy.ask();
  }

  nextSearch() {
    if (this.canNext) {
      if (this.result[this.page]) {
        this.printResult(this.result[this.page]);
        this.page += 1;
        return;
      }
      this.page += 1;
      this.search();
      return;
    }
    console.log(colors.yellow('已经到底~\\(≧▽≦)/~啦'));
    Dmhy.ask();
  }

  static ask() {
    console.log(`\n  继续操作:\n    1.输入一个序号从而复制相关磁力链接到剪切板\n    2.输入p/n,进行前/后翻页   \n    3.输入q退出程序`);
    process.stdin.resume();
  }


  printResult(result) {
    if (result.length > 0) {
      result.forEach((item, idx) => {
        const regx = new RegExp(argv.s, 'gi');
        console.log(`  ${colors.blue(idx + 1)}  ${item.title.replace(regx, colors.blue(argv.s))}\n`);
      });

      const nav = result.nav;
      if (nav) {
        if (nav.length === 1) {
          const p = nav[0].match(/list\/page\/(\d+)\?/)[1];
          if (p < this.page) {
            this.canPrev = true;
            this.canNext = false;
            return console.log(`  上一页 第${this.page}页`);
          }
          this.canNext = true;
          this.canPrev = false;
          console.log(`   第${this.page}页 下一页`);
        }

        if (nav.length === 2) {
          this.canNext = true;
          this.canPrev = true;
          console.log(`上一页 第${this.page}页 下一页`);
        }
      }
    } else {
      console.log(` 没有找到${colors.yellow(argv.s)}相关的内容`);
    }
    return Dmhy.ask();
  }
}

const cli = new Dmhy();
cli.search();
