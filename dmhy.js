#!/usr/bin/env node
const request = require('request');
const cheerio = require('cheerio');
const colors = require('colors');
const clipboardy = require('clipboardy');
const argv = require('yargs')
			.default('c', 0)
			.default('o', 'date-desc')
			.alias('c', 'cate')
			.describe('c', '在下列分类中搜索')
			.choices('c', [0, 2, 31, 3, 41, 42, 4, 43, 44, 15, 6, 7, 9, 17, 18, 19, 20, 21, 12, 1])
			.alias('o', 'order')
			.describe('o', '按下列顺序排序')
			.choices('o', ['date-desc', 'date-asc', 'rel'])
			.alias('s', 'search')
			.describe('s', '搜索标题')
			.demand(['s'])
			.usage('Usage: $0 -s [标题] -o [排序方式] -c [分类] -h [帮助]')
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
		process.stdin.on('data', data => {
			const msg = data.trim();
			const num = Number(msg);
			if (msg === 'q') {
				process.exit(0);
			} else if (msg === 'p') {
				this.prevSearch();
			} else if (msg === 'n') {
				this.nextSearch();
			} else if (num && num > 0 && num <= this.result.length) {
				clipboardy.write(this.result[num].magnet)
					.then(() => {
						console.log(colors.green('成功复制到剪贴板'))
						this.ask();
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
		const url = `http://share.dmhy.org/topics/list/page/${this.page}?keyword=${argv.s}&sort_id=${argv.c}&team_id=0&order=${argv.o}`;
		console.log(`\n => searching for ${colors.blue(argv.s)}\n`);
		request(url,  (err, res, body) => {
			if (err) return console.error(err);

			if (res.statusCode === 200) {
				const self = this;
				const $ = cheerio.load(body);
				const nav = [];
				$('a', '.nav_title > .fl ').each(function () {
					nav.push($(this).attr('href'));
				});
				$('tr', 'tbody').each(function () {
					const item = {};
					const tds = $(this).find('td');
					item.pubtime = tds.first().find('span').text();
					item.category = tds.eq(1).text();
					item.tag = tds.eq(2).find('.tag').text();
					item.title = tds.eq(2).children('a').text().trim();
					item.magnet = tds.eq(3).children('a').attr('href');
					item.size = tds.eq(4).text();
					item.btnum = tds.eq(5).text();
					item.downum = tds.eq(6).text();
					item.finish = tds.eq(7).text();
					item.publisher = tds.eq(8).text();
					self.result.push(item);
				});
				this.printResult(this.result, nav);
			}
		});
	}

	prevSearch() {
		if (this.canPrev) {
			this.page--;
			return this.search();
		}
		console.log(colors.yellow('已经是第一页~\\(≧▽≦)/~啦啦啦'));
		this.ask();
	}

	nextSearch() {
		if (this.canNext) {
			this.page++;
			return this.search();
		}
		console.log(colors.yellow('已经到底~\\(≧▽≦)/~啦'));
		this.ask();
	}

	ask() {
		console.log(`\n  继续操作:\n    1.输入一个序号从而复制相关磁力链接到剪切板\n    2.输入p/n,进行前/后翻页   \n    3.输入q退出程序`);
		process.stdin.resume();
	}

	printResult(result, nav) {
		if (result.length > 0) {
			result.forEach((item, idx) => {
				const regx = new RegExp(argv.s, 'gi');
				console.log(`  ${colors.blue(idx + 1)}  ${item.title.replace(regx, colors.blue(argv.s))}\n`);
			});

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
		this.ask();
	}
}

const cli = new Dmhy();
cli.search();




