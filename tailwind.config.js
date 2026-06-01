module.exports = {
    content: [
        "./wwwroot/**/*.{html,js}",
        "./Pages/**/*.{razor,cshtml}",
        "./Components/**/*.razor",
    ],
    safelist: [

        // Option B — use a pattern (covers whole families at once)
        {
            pattern: /bg-(red|green|blue|yellow|sky)-(100|500|900)/,
        },
        {
            pattern: /text-(red|green|blue|yellow|sky)-(100|500|900)/,
        },
    ],
    theme: {},
    plugins: [],
}