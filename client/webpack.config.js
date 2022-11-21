const path = require('path');
const dotenv = require('dotenv-webpack');

module.exports = {
    entry: {
        background: "./src/ts/background.ts",
        menu:       "./src/ts/menu.ts",
    },
    plugins: [
        new dotenv()
    ],
    devtool: 'inline-source-map',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'build'),
    },
};