/* global Terminal, FitAddon, SearchAddon */
const split = (text) => {
	return text.split(/\n/g);
};

class Renderer {
	constructor() {
		this.term = new Terminal({
			cursorBlink: false,
			theme: {
				foreground: '#93A1A1',
				background: '#002B36',
				cursor: '#D30102',
				cursorAccent: '#D30102',
				selection: '#2AA19899',
				black: '#073642',
				red: '#dc322f',
				green: '#859900',
				yellow: '#b58900',
				blue: '#268bd2',
				magenta: '#d33682',
				cyan: '#2aa198',
				white: '#eee8d5',
				brightBlack: '#586e75',
				brightRed: '#cb4b16',
				brightGreen: '#586e75',
				brightYellow: '#657b83',
				brightBlue: '#839496',
				brightMagenta: '#6c71c4',
				brightCyan: '#93a1a1',
				brightWhite: '#fdf6e3',
			},
		});
		const fitAddon = new FitAddon.FitAddon();
		this.term.loadAddon(fitAddon);
		this.term.loadAddon(new SearchAddon.SearchAddon());
		this.container = document.querySelector('#terminal');

		this.term.open(this.container);
		fitAddon.fit();

		window.addEventListener('resize', () => {
			fitAddon.fit();
		});

		this.fetch = this.fetch.bind(this);
		this.initialRender = this.initialRender.bind(this);
		this.subscribe = this.subscribe.bind(this);
		this.renderTabs = this.renderTabs.bind(this);
		this.fetch();
	}

	async fetch() {
		const response = await fetch('/rest/tabs');
		const tabs = await response.json();
		this.tabs = tabs;
		this.renderTabs();

		this.selectTab(tabs[0]);
		this.subscribe(tabs);
	}

	subscribe(tabs) {
		const sub = new WebSocket(`ws://localhost:${location.port}/sub`);
		sub.onmessage = (message) => {
			const data = JSON.parse(message.data);
			const tab = tabs.find((tab) => tab.id === data.tab);
			if (tab) {
				if (data.payload) {
					tab.logs.push(data.payload);
					if (this.currentTab.id === tab.id) {
						for (const line of split(data.payload.line)) {
							this.term.writeln(line);
						}
					}
				}
				else if (data.type === "status") {
					tab.running = data.running
					this.renderTabs()
				}
			}
		};
	}

	renderTabs() {
		const tabsContainer = document.querySelector('.tabs');
		tabsContainer.innerHTML = ""; // clear old

		for (const tab of this.tabs) {
			const elem = document.createElement('span');
			elem.innerText = tab.name;
			elem.classList.add('tab');
			elem.setAttribute('data-id', tab.id);
			elem.addEventListener('click', () => {
				this.selectTab(tab);
			});

			const wrapper = document.createElement("div");
			wrapper.classList.add("tab-wrapper");

			// start button
			const startBtn = document.createElement("button");
			startBtn.innerText = "▷";
			startBtn.style.marginLeft = "8px";
			startBtn.addEventListener("click", async (e) => {
				e.stopPropagation();
				await this.startTab(tab.name);
			});

			// stop button
			const stopBtn = document.createElement("button");
			stopBtn.innerText = "▢";
			stopBtn.style.marginLeft = "4px";
			stopBtn.addEventListener("click", async (e) => {
				e.stopPropagation();
				await this.stopTab(tab.name);
			});

			const statusDot = document.createElement("span");
			statusDot.innerText = tab.running ? "⏺" : "◯";
			statusDot.style.color = tab.running ? "green" : "red";
			statusDot.style.marginLeft = "6px";

			wrapper.appendChild(startBtn);
			wrapper.appendChild(stopBtn);
			wrapper.appendChild(statusDot);
			elem.appendChild(wrapper);

			tabsContainer.appendChild(elem);
		}
	}

	selectTab(tab) {
		const selected = document.querySelector('.selected-tab');
		if (selected) selected.classList.remove('selected-tab');
		document.querySelector(`[data-id="${tab.id}"]`).classList.add('selected-tab');
		this.currentTab = tab;
		this.initialRender(tab);
	}

	initialRender(tab) {
		this.term.clear();
		for (const log of tab.logs) {
			for (const line of split(log.line)) {
				this.term.writeln(line);
			}
		}
	}

	async startTab(name) {
		await fetch(`/rest/start/${encodeURIComponent(name)}`, { method: "POST" });
	}

	async stopTab(name) {
		await fetch(`/rest/stop/${encodeURIComponent(name)}`, { method: "POST" });
	}
}

// term.write('Hello from \033[1;3;31mxterm.js\033[0m $ ');

window.r = new Renderer();
