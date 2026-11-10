# ai-sdk.pro — Edge and layer specification

The latest live design and the user's request prioritize deliberate edges, layered panels, restraint, and precision. This file is an implementation specification, not a claimed Figma artifact. No Figma document has been created in this task.

## Surface hierarchy

The canvas is true black (#000000). Layer one is a low-emphasis panel (#090909). Layer two is a raised technical surface (#101010). Nested code/output returns to #050505 so the parent frame and inner content are visibly distinct. Surfaces should not all share the same background. Selected controls use a restrained red-tinted wash, not a filled neon panel.

## Edge hierarchy

Section dividers use #202020–#242424. A panel frame uses #292929–#303030. An inset top highlight uses white at 3% opacity to suggest a subtle material edge. Focus uses a visible red outline with offset, separate from default borders. The terminal has a 14px outer radius; media frames use 16px; nested outputs use 10–12px; tabs use small 3–6px corners or a true pill. Nested radii decrease inward instead of being repeated indiscriminately.

## Depth and light

Technical cards receive one soft external shadow and one inset highlight. Hero ground illumination is a broad, low-opacity red ellipse below the terminal, never a glow around every card. The grid sits behind content, fades out radially, and never crosses foreground panel text. A sticky translucent header occupies its own layer, separate from overlay/dialog layers. Modals always have a dim backdrop and stronger frame contrast.

## Geometry

Desktop hero heading is 76px/1.02 with -3.42px tracking; body is 16px/24px, maximum 576px. Terminal maximum is 768px. Content rows are maximum 1152px with two equal columns, 64px separation and 96px vertical rhythm. A technical frame has 22px inset; mobile uses 16px. Components align to shared content edges rather than independent centering. Desktop sections and mobile layouts are distinct compositions, not scaled screenshots.

## Interaction

Tabs show a clearly selected surface and expose aria-selected. Clipboard controls acknowledge success and remain keyboard-accessible. Menus, code regions and FAQ preserve calm focus states. Shadows do not pulse; examples never pretend to be running infrastructure. Tool traces and stream state in the playground reflect actual API events. Reduce-motion preferences disable decorative animation.

## Figma translation

Create reusable color variables for canvas/panel/raised/inset/line/subtle/selected. Use auto-layout for terminal, tab group, output panel and paired content rows. Separate frame, inset highlight, content and optional ground-light layers. Constrain terminal max width and establish desktop/mobile component variants. Figma access must be connected before creating or claiming a native design file.
