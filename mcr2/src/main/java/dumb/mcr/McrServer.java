package dumb.mcr;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.IOException;

public class McrServer {
    private final Session session;
    private final Gson gson;

    public McrServer(Session session) {
        this.session = session;
        this.gson = new GsonBuilder().setPrettyPrinting().create();
    }

    public void start() throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(System.in))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.equalsIgnoreCase("exit")) {
                    break;
                }
                QueryResult result = session.nquery(line);
                String jsonResult = gson.toJson(new JsonResult(result));
                System.out.println(jsonResult);
            }
        }
    }

    // A helper class to structure the JSON output
    private static class JsonResult {
        private final boolean success;
        private final String originalQuery;
        private final Object bindings;

        JsonResult(QueryResult queryResult) {
            this.success = queryResult.success();
            this.originalQuery = queryResult.originalQuery();
            this.bindings = queryResult.bindings();
        }
    }
}
