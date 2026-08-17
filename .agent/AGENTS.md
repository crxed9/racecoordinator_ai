# Race Coordinator AI Agent Rules

## SQLite Database Engine
Race Coordinator AI uses embedded SQLite (`sqlite-jdbc`) for all persistent data storage. MongoDB has been completely removed.

## Test Coverage Quality Gates
- **Never lower test coverage thresholds**: The AI agent must never unilaterally reduce code coverage minimum thresholds (e.g. in `server/pom.xml`, `client/karma.conf.js`, or any CI configuration) to make tests pass or resolve coverage gate failures.
- **Add tests instead**: If coverage falls below the configured limits, the agent must write new unit or integration tests to satisfy and exceed the required coverage.
- **Explicit user approval required**: If the coverage values are ever deemed too tight or need reduction, the agent must not reduce them automatically. The decision must be brought to the user for careful review and explicit approval first.
