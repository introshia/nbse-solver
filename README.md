# NBS Root Solver 🧮

A premium, interactive web application for finding the roots of mathematical functions using popular numerical methods. Built with a focus on rich aesthetics, real-time visualization, and professional-grade features.

![Banner](https://img.shields.io/badge/Numerical--Analysis-Root--Solver-blue?style=for-the-badge)

## ✨ Features

- **Three Core Methods**:
  - **Newton's Method**: Rapid convergence using derivatives (with automatic **Symbolic Differentiation** backup).
  - **Bisection Method**: Robust, bracket-based convergence with visual boundary markers.
  - **Secant Method**: Fast convergence without needing explicit derivatives.
- **Advanced Graphing Engine**:
  - Real-time plotting of functions and roots.
  - **Interactive Panning & Zooming**: Explore the curve with your mouse/touch.
  - **Visual Hints**: Tangent lines and bracket boundaries rendered directly on the graph.
- **Data & Export**:
  - **CSV Export**: Download your iteration history as a spreadsheet-ready file.
  - **History Persistence**: Remembers your previous equations for quick access.
- **Premium UI/UX**:
  - **Light & Dark Mode**: Seamless theme switching with persistent preferences.
  - **Live Validation**: Real-time syntax checking of mathematical expressions.
  - **Mobile Responsive**: Fully optimized for phones, tablets, and desktops.

## 🚀 Getting Started

No installation is required to view the project! Simply follow one of these methods:

### Method 1: The Professional Way (Recommended)
If you have **Node.js** installed, run:

```bash
# Install dependencies
npm install

# Start the local server
npm start
```

### Method 2: Python Server
If you are on a Mac or have Python installed:

```bash
python3 -m http.server 8000
```
Then visit `http://localhost:8000`.

### Method 3: Direct View
Simply open `index.html` in any modern web browser.

## 🧪 Automated Testing
This project includes a suite of automated unit tests powered by **Jest** to ensure mathematical accuracy.

```bash
# Run the test suite
npm test
```

## 🛠️ Technologies Used

- **HTML5/CSS3**: Semantic structure and an adaptive CSS Variable design system.
- **JavaScript (ES6+)**: High-performance algorithm logic and DOM manipulation.
- **Math.js**: Symbolic differentiation and advanced expression parsing.
- **HTML5 Canvas**: Custom-built interactive graphing engine.
- **Jest**: Industry-standard testing framework.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Created with ❤️ for Numerical Analysis students and enthusiasts.*
