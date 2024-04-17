import { XMLParser } from 'fast-xml-parser';
const parser = new XMLParser({
	ignoreAttributes : false,
	attributeNamePrefix : "attr_",
	alwaysCreateTextNode: true,
});

export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export async function rss2data(url, max = 5, order = "newFirst") {
	const rssResponse = await fetch(url);
	const rssOK = await rssResponse.ok;
	if (!rssOK) return {
		"rssOK": rssOK,
	}
	const rssText = await rssResponse.text();
	const feed = parser.parse(rssText);
	const isNotAtom = feed.rss ? true : false;
	const title = (isNotAtom ? feed.rss.channel.title : feed.feed.title)['#text'];
	const link = isNotAtom 
		? feed.rss.channel.link.attr_href ?? feed.rss.channel.link['#text']
		: feed.feed.link.length > 1
			? feed.feed.link[0].attr_rel == "alternate"
				? feed.feed.link[0].attr_href
				: feed.feed.link[1].attr_href
			: feed.feed.link['#text'];
	const posts = isNotAtom ? feed.rss.channel.item : feed.feed.entry;
	let newestFirst = order == "newFirst";
	if (order == "random") {
		posts.sort(function(a, b){
			return new Date((isNotAtom ? b.pubDate : b.published ?? b.updated)['#text']) - new Date((isNotAtom ? a.pubDate : a.published ?? a.updated)['#text']);
		});
		newestFirst = true;
	}
	let entries = [];
	for (let entry = newestFirst ? 0 : posts.length - 1; newestFirst ? entry < max : entry >= (posts.length - max); newestFirst ? entry++ : entry--) {
		const entryDate = new Date((isNotAtom ? posts[entry].pubDate : posts[entry].published ?? posts[entry].updated)['#text']);
		const dateOptions = {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		};
		let entryLink = posts[entry].link['#text'] ?? posts[entry].link.attr_href ?? posts[entry].link[0].attr_href;
		if (!entryLink.startsWith('http')) entryLink = `${link}${entryLink}`;
		entries.push({
			"title": posts[entry].title['#text'] != "" ? posts[entry].title['#text'] : entryDate.toLocaleDateString('en-GB', dateOptions),
			"link":  posts[entry].link['#text'] ?? posts[entry].link.attr_href ?? posts[entry].link[0].attr_href,
			"date": entryDate.toISOString().slice(0, 10),
		});
	}
	return {
		"title": title,
		"link": link,
		"rssLink": url,
		"entries": entries,
		"rssOK": rssOK,
	}
}
