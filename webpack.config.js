const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'development',

    entry: path.join(__dirname, 'src', 'index.ts'),

    output: {
        filename: 'main.js',
        path: path.join(__dirname, 'build'),
        clean: true,
    },

    // Enable sourcemaps for debugging webpack's output.
    devtool: 'source-map',

    devServer: {
        static: {
            directory: path.join(__dirname, 'public'),
        },
        port: 3000,
        open: true,
        compress: true,
    },

    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: ['.ts', '.tsx', '.js', '.json']
    },

    module: {
        rules: [
            // All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
            { test: /\.tsx?$/, loader: 'ts-loader' },

            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            { enforce: 'pre', test: /\.js$/, loader: 'source-map-loader' },

            {
                test: /\.css$/, use:
                    [
                        {
                            loader: MiniCssExtractPlugin.loader,
                        },
                        'css-loader'
                    ]
            },

            // fix for babylonjs
            {
                test: /\.m?js/,
                resolve: {
                    fullySpecified: false
                }
            }
        ]
    },

    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'public' },
                {
                    from: './node_modules/@egr/wcf/data',
                    to: 'w-cf/data',
                },
                {
                    from: './node_modules/@egr/wcf/libs',
                    to: 'w-cf/libs',
                },
                {
                    from: './node_modules/@egr/wcf/styles',
                    to: 'w-cf/styles',
                }
            ]
        }),
        new MiniCssExtractPlugin({
            filename: '[name].css',
            chunkFilename: '[id].css',
        }),
    ]
};