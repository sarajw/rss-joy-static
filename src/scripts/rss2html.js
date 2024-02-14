const parser = new DOMParser();
const location = window.location.hostname;

function strip(html){
	let doc = parser.parseFromString(html, 'text/html');
	return doc.body.textContent || "";
}

async function rss2html(url, max) {
	if (location !== "127.0.0.1" && location !== "localhost") {
		url = `/rewrite/${url.replace(/^https?\:\/\//i, "")}`;
	}
	const rssResponse = await fetch(url);
	const rssText = await rssResponse.text();
	const doc = parser.parseFromString(rssText, "application/xml");
	window.rssDocs ??= {};
	Object.assign(window.rssDocs, { [url]: doc });
	const title = doc.querySelector("channel > title, feed > title").textContent;
	const link =
		doc.querySelector("channel > link")?.textContent ||
		doc.querySelector("feed > link:not([rel])")?.getAttribute("href");
	const maxItems = parseInt(max, 10) || Infinity;
	const items = Array.from(doc.querySelectorAll("channel > item, feed > entry"))
		.slice(0, maxItems)
		.map((item) => ({
			title: item.querySelector("title").textContent,
			link:
				item.querySelector("link")?.textContent ||
				item.querySelector("link")?.getAttribute("href"),
		}));
	return /*html*/ `<article style="--hue: ${Math.random() * 360}">
			<h2>${link ? /*html*/ `<a href="${link}">${title}</a>` : title}</h2>
			<a class="rss" href=${url} aria-label="RSS feed"><svg width="1rem" height="1rem" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M0 64C0 46.3 14.3 32 32 32c229.8 0 416 186.2 416 416c0 17.7-14.3 32-32 32s-32-14.3-32-32C384 253.6 226.4 96 32 96C14.3 96 0 81.7 0 64zM0 416a64 64 0 1 1 128 0A64 64 0 1 1 0 416zM32 160c159.1 0 288 128.9 288 288c0 17.7-14.3 32-32 32s-32-14.3-32-32c0-123.7-100.3-224-224-224c-17.7 0-32-14.3-32-32s14.3-32 32-32z"/></svg></a>
			<ul>
			${items.map(
				(item) => /*html*/ `
				<li>
					<a href="${item.link}">${item.title}</a>
				</li>
				`
			).join("")}
			</ul>
		</article>`;
}
class RssList extends HTMLElement {
	static observedAttributes = ["src", "max"];
	pending = false;

	constructor() {
		super();
	}

	update() {
		if (!this.getAttribute("src") || this.pending) return;
		this.innerHTML = `<article style="background-color: hsla(0, 0%, 50%, 0.1); display: grid; place-content: center"><p>Loading ${this.getAttribute("src")}</p></article>`;
		this.pending = true;
		rss2html(this.getAttribute("src"), this.getAttribute("max")).then(
			(html) => {
				this.innerHTML = html;
				this.pending = false;
			}
		);
	}

	connectedCallback() {
		this.update();
	}

	attributeChangedCallback(name) {
		if (["max", "src"].includes(name)) {
			this.update();
		}
	}
}

customElements.define("rss-list", RssList);