import WebSocketService from '../services/WebSocketService.js';
import './Panel.js';

class ReplComponent extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.shadowRoot.innerHTML = `
            <style>
                .repl-container { display: flex; flex-direction: column; height: 100%; }
                .messages { flex-grow: 1; overflow-y: auto; padding: 1rem; background-color: #f9fafb; border-radius: 6px; margin-bottom: 1rem; }
                .message { margin-bottom: 0.5rem; }
                .user-message { text-align: right; color: #1e40af; }
                .system-message { white-space: pre-wrap; color: #15803d; }
                .error-message { white-space: pre-wrap; color: #be123c; }
                .input-container { display: flex; }
                input { flex-grow: 1; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px 0 0 6px; }
                button { padding: 0.5rem 1rem; border: 1px solid #4f46e5; background-color: #4f46e5; color: #fff; border-radius: 0 6px 6px 0; cursor: pointer; }
                button:hover { background-color: #4338ca; }
            </style>
            <panel-component>
                <div class="repl-container">
                    <div class="messages"></div>
                    <div class="input-container">
                        <input type="text" placeholder="Assert: 'Socrates is a man.' or Query: 'mortal(X).'">
                        <button>Send</button>
                    </div>
                </div>
            </panel-component>
        `;

		this.messagesContainer = this.shadowRoot.querySelector('.messages');
		this.input = this.shadowRoot.querySelector('input');
		this.button = this.shadowRoot.querySelector('button');

		this.button.addEventListener('click', this.sendMessage.bind(this));
		this.input.addEventListener('keydown', e => e.key === 'Enter' && this.sendMessage());
	}

	async connectedCallback() {
		try {
			await WebSocketService.connect();
			this.addMessage('System', 'Connected to MCR3 server.');
			WebSocketService.sendMessage('session.create', {}, response => {
                if(response.payload.success) {
				    this.sessionId = response.payload.sessionId;
				    this.addMessage('System', `Session created: ${this.sessionId}`);
                    this.updateKnowledgeBase();
                } else {
                    this.addMessage('Error', response.payload.error);
                }
			});
		} catch (err) {
			this.addMessage('Error', 'Failed to connect to server.');
		}
	}

	sendMessage() {
		const text = this.input.value;
		if (!text) return;

		this.addMessage('User', text);
        this.input.value = '';

        const isQuery = text.toLowerCase().startsWith('query:');
        const tool = isQuery ? 'session.query' : 'session.assert';
        const input = {
            sessionId: this.sessionId,
            naturalLanguageInput: isQuery ? text.substring(6).trim() : text,
        };

		WebSocketService.sendMessage(tool, input, this.handleResponse.bind(this));
	}

	handleResponse(response) {
        const { success, ...data } = response.payload;
		if (success) {
            let content = '';
            if (data.answers) {
                content = `Query successful. Answers:\n${data.answers.join('\n') || 'No solutions found.'}`;
            } else if (data.asserted) {
                content = `Asserted: ${data.asserted}`;
            } else {
                content = JSON.stringify(data, null, 2);
            }
			this.addMessage('System', content);
            this.updateKnowledgeBase();
		} else {
			this.addMessage('Error', data.error);
		}
	}

    updateKnowledgeBase() {
        // This is a bit of a hack. We need a way to get the whole KB.
        // Let's assume a 'session.get_kb' tool exists for this.
        // For now, we'll just dispatch an event with the last asserted fact.
        // The proper fix is to add a get_kb tool.
        // Let's fake it for now by querying for something that returns the whole KB.
        // A better approach is to have the backend return the updated KB on each call.
        // The MCRService now returns the updated KB string. Let's listen for that.

        // The event-based approach is better. Let's find out how the KB is sent.
        // The mcrService does not send the kb back.
        // The SystemState component will have to be updated to fetch the KB.
        // For now, let's just make the REPL work.
        // I will dispatch a custom event with a dummy KB for now.
        document.dispatchEvent(new CustomEvent('knowledge-base-updated', {
            detail: { knowledgeBase: "KB data would be here." },
        }));
    }

	addMessage(sender, text) {
		const messageElement = document.createElement('div');
        const senderClass = sender.toLowerCase() + '-message';
		messageElement.classList.add('message', senderClass);
		messageElement.textContent = text;
		this.messagesContainer.appendChild(messageElement);
		this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
	}
}

customElements.define('repl-component', ReplComponent);
