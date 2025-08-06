package dumb.mcr;

import dumb.lm.LMClient;
import dumb.common.tools.ToolProvider;

public class MCR {

    private final LMClient lmClient;

    public MCR(LMClient lmClient) {
        this.lmClient = lmClient;
    }

    public Session createSession(ToolProvider toolProvider) {
        return new Session(lmClient, toolProvider);
    }

    public Session createSession() {
        return createSession(null);
    }
}
