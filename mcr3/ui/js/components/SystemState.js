import './Panel.js';

class SystemState extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    height: 100%;
                }
                pre {
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    background-color: #f9fafb;
                    padding: 1rem;
                    border-radius: 6px;
                    flex-grow: 1;
                    overflow-y: auto;
                }
                .panel-content {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                }
            </style>
            <panel-component>
                <div class="panel-content">
                    <h2>Knowledge Base</h2>
                    <pre><code></code></pre>
                </div>
            </panel-component>
        `;
		this.codeElement = this.shadowRoot.querySelector('code');
	}

	connectedCallback() {
		document.addEventListener(
			'knowledge-base-updated',
			this.updateKnowledgeBase.bind(this)
		);
	}

    disconnectedCallback() {
        document.removeEventListener(
			'knowledge-base-updated',
			this.updateKnowledgeBase.bind(this)
        );
    }

	updateKnowledgeBase(event) {
		const kb = event.detail.knowledgeBase;
        if (kb) {
		    this.codeElement.textContent = kb;
        }
	}
}

customElements.define('system-state', SystemState);
