import React from 'react'
import TitleBar from './TitleBar'
import AppBaseProps from './interfaces/AppBaseProps'

export default function AppBase({ body, children, callBack }: AppBaseProps) {
	const appRef = React.createRef<HTMLDivElement>()

	React.useEffect(() => {
		if (callBack !== undefined) callBack()
	})

	return (
		<div ref={appRef} id="App">
			<TitleBar />
			{/* <ul id="client-list">All Clients</ul>
			<ul id="world-list">All Worlds</ul> */}
			{children}
			{body}
		</div>
	)
}
