# Skill: qa-tester
**Description:** Instructions for test case design, test implementation, and execution.

### Workflow:
- **Analyze**: Examine the source code to identify critical logic and edge cases.
- **Design**: Define a list of test cases covering both Unit and Integration levels.
- **Write**: Use the appropriate command or tool to generate test files (e.g., *.test.ts, test_*.py).
- **Execute**: Run the appropriate test command (e.g., npm test, pytest).
- **Report**: Read terminal outputs thoroughly. Capture logs, summarize root causes for failures, and present the results in two separate summary tables (Unit and Integration testing).

### Parameters:
- `command`: The shell command to execute the tests or generate test files.

### Constraints:
- **Mandatory Test Generation**: You **MUST** write both Unit Tests and Integration Tests for all new features, core components, and common utility modifications. Skip is not allowed.
- **Strict Verification Logs**: You **MUST** execute the tests and paste the complete, raw terminal verification logs in your final report. Never conclude "Pass" without verifiable logs.
- **Pre-execution Requirement**: Test files must be fully written and structured before executing the test command.
- **Integration Test Focus**: Integration tests must specifically target the interaction between the new code, third-party libraries (e.g., Firestore), and other existing system components.
- **Automated Database Cleanup**: Any integration tests that write data to real or external database services (such as Firestore) **MUST** implement proper cleanup logic (e.g., using `afterAll` or `afterEach` hooks) to completely delete and teardown the created records immediately after test execution.
- **Tabular QA Report**: The final report **MUST** include a simple, clean summary formatted as **two separate markdown tables**: one for **Unit Testing** and one for **Integration Testing**. Each table must contain exactly two columns: `test_case` and `result` (e.g., containing ✅ **PASS** or ❌ **FAIL**).

### Unit & Integration Testing Directories:
- **Unit Testing Directories (ที่จัดเก็บไฟล์ Unit Test)**:
  - For features (e.g., under `src/features/[name]/` or `src/features/[name]/v1/`), write the test files inside a `__test__` subdirectory in the corresponding feature folder (e.g., `src/features/[name]/v1/__test__/`).
  - For core or common components (e.g., under `src/core/` or `src/common/`), write the test files inside `src/core/__test__` or `src/common/__test__` respectively.
- **Integration Testing Directories (ที่จัดเก็บไฟล์ Integration Test)**:
  - Write the integration test files inside the project root `__test__/` directory outside the `src/` folder (e.g., `__test__/` at the workspace root).

### Mandatory Step-by-Step QA Execution:
1. **Analyze**: Review code changes immediately after development completes.
2. **Design & Plan**: List test cases covering all edge cases, validations, and happy paths.
3. **Scaffold Tests**: Generate Unit Tests and Integration Tests in their respective designated directories.
4. **Execute**: Run the test suite via the test command (e.g. `bun test`).
5. **Report**: Present the complete, raw terminal logs of passing tests as evidence along with two simplified summary tables mapping `test_case` to `result` (one for Unit Testing and one for Integration Testing). If any test fails, report the detailed failure logs back to the Developer Agent and repeat until all tests pass.