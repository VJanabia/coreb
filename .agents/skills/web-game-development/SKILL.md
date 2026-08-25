---
name: web-game-development
description: Use when developing, modifying, testing, debugging, or polishing HTML5 browser games. Requires actually running the game and verifying gameplay instead of relying only on code inspection or compilation.
---

# Web Game Development

You are developing a production-quality HTML5 browser game.

## Core principle

Never consider a game task complete merely because the TypeScript/JavaScript compiles.

After implementing or changing gameplay, actually run the game and verify it in a real browser whenever possible.

## Development workflow

Follow this workflow:

1. Inspect the existing project before changing architecture.
2. Understand the current game loop, scenes, assets, input system, level data, and UI.
3. Make the smallest coherent implementation.
4. Start the development server.
5. Open the game in a real browser.
6. Test the actual player interaction.
7. Inspect the browser console for errors.
8. Inspect the visual result.
9. Take screenshots when visual verification is useful.
10. Fix discovered problems.
11. Test again.
12. Only then report the task as complete.

## Gameplay verification

For every gameplay change, verify:

- The game starts correctly.
- The main gameplay area is visible.
- Player input works.
- Buttons work.
- Restart works.
- Game-over conditions work.
- Level transitions work when applicable.
- Score/state updates correctly.
- No obvious JavaScript errors occur.
- No missing asset errors occur.
- No major visual overlap occurs.

## Visual verification

Do not assume that generated UI or game objects look correct from code alone.

Check:

- Game objects are visible.
- Objects are positioned correctly.
- Text is readable.
- Buttons are clickable.
- Important objects are not hidden behind other objects.
- Mobile layout does not break.
- The game is not accidentally rendered as a blank screen.
- Assets have actually loaded.

When a visual problem is discovered, fix the implementation and test again.

## Level design

For level-based games:

- Avoid making every level a simple copy of the previous level.
- Change layouts, positions, timing, patterns, or mechanics progressively.
- Difficulty should increase gradually.
- Avoid excessive object counts that make the game visually cluttered.
- Prefer meaningful variation over simply adding more objects.

## User requirements have priority

If the user gives concrete gameplay constraints, treat them as hard requirements.

Example:

- If the user says a level has a maximum of 15 pins, never exceed 15.
- If the user requests different arrangements between levels, do not reuse identical layouts.
- If the user requests an image for an object, do not leave it as an invisible placeholder.
- If the user says an object needs a visible representation, verify that representation in the browser.

## Existing project

Do not rewrite a working game from scratch unless explicitly requested.

Prefer modifying the existing implementation while preserving:

- existing gameplay
- existing UI
- existing assets
- existing level data
- existing build configuration

unless the current implementation prevents the requested change.

## Testing

Use the project's existing testing tools when available.

If Playwright is installed, use it for browser interaction and screenshots.

At minimum, verify the actual page in a browser after meaningful gameplay changes.

## Completion criteria

Before saying the task is complete:

- The project builds successfully.
- The game launches successfully.
- The requested feature works in the browser.
- Important interactions have been tested.
- Console errors have been checked.
- Visual issues found during testing have been fixed.
- User-specified constraints have been checked explicitly.