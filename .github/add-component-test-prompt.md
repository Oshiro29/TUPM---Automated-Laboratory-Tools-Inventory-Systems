# Prompt template: Scaffold a component test

When to use
- Use this prompt to ask an AI assistant to scaffold a unit/component test for a React component in this repo.

Prompt template
- Component path (relative): `src/components/MyComponent.jsx`
- Test framework preference: `vitest` or `jest` (if blank, suggest `vitest` + `@testing-library/react`)
- Props / scenario: short description of the scenarios to test (e.g., "renders list items and calls onSelect when clicked")
- Additional mocks: any network or module mocks needed

Example assistant instructions
Please scaffold a component test file for `src/components/KioskToolSelection.jsx` using `vitest` and `@testing-library/react`. Test scenarios:
- Renders the list of tools from `tools` prop
- When a tool item is clicked, calls `onSelect(toolId)`
- Shows a placeholder when `tools` is empty

What to generate
- A test file under `src/components/__tests__/KioskToolSelection.test.jsx` with imports, basic setup, 3 test cases above, and recommended `npm` commands to run the tests.
- If `vitest` is not in `devDependencies`, add instructions to install and configure it.

Notes for the assistant
- Keep the test focused and minimal; do not alter component source code unless necessary.
- If adding devDependencies, include the `npm install --save-dev ...` command and an optional short `vitest` config suggestion.
