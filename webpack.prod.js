import { merge } from "webpack-merge"
import common from "./webpack.common.js"

const conf = {
	mode: "production",
	performance: {
		hints: false,
	},
}

export default [
	merge(common.client, conf),
	merge(common.server, conf),
	merge(common.electron, conf),
]