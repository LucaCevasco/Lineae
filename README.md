# Lineae

Lightweight, AI-powered open-source UML drafting tool.

## What is Lineae?

Lineae is a browser-based UML editor built with React and Vite. It combines a clean drag-and-drop canvas with AI features — including natural-language chat for modifying diagrams and Java code export/import — to make UML drafting fast and fluid.

## Features

- **Class diagrams** — create classes with attributes, methods, and stereotypes
- **Drag & drop** — move and arrange elements freely on the canvas
- **Relationships** — association, inheritance, composition, aggregation, and more
- **AI chat** — describe changes in natural language and let AI modify your diagram
- **Java export/import** — generate Java code from diagrams or import Java to generate diagrams
- **SVG & PNG export** — export diagrams as images
- **JSON save/load** — persist and restore your work
- **Undo/redo** — full history support
- **Snap-to-grid** — align elements precisely
- **Auto-layout** — automatically arrange diagram elements

## Roadmap

- Sequence diagrams
- Excalidraw-style freeform diagrams
- Additional diagram types
- Integrations (Linear, Slack)

## How to Run

### Prerequisites

- Node.js 18+

### Setup

```bash
git clone https://github.com/your-username/lineae.git
cd lineae
npm install
```

Create a `.env` file in the project root:

```
VITE_OPENAI_API_KEY=your_openai_api_key
```

Start the development server:

```bash
npm run dev
```

## How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m "Add my feature"`)
4. Push to your branch (`git push origin feature/my-feature`)
5. Open a pull request

For larger changes, please open an issue first to discuss the approach.

## License

Open source. License TBD.
