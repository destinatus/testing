import {
	VSCodeDropdown,
	VSCodeOption,
	VSCodeTextField,
} from "@vscode/webview-ui-toolkit/react"
import { memo, useMemo } from "react"
import { ApiConfiguration, ModelInfo } from "../../../../src/shared/api"
import { useExtensionState } from "../../context/ExtensionStateContext"

interface ApiOptionsProps {
	showModelOptions: boolean
	apiErrorMessage?: string
	modelIdErrorMessage?: string
}

const ApiOptions = ({ showModelOptions, apiErrorMessage, modelIdErrorMessage }: ApiOptionsProps) => {
	const { apiConfiguration, setApiConfiguration } = useExtensionState()

	const handleInputChange = (field: keyof ApiConfiguration) => (event: any) => {
		setApiConfiguration({ ...apiConfiguration, [field]: event.target.value })
	}

	const { selectedProvider } = useMemo(() => {
		return normalizeApiConfiguration(apiConfiguration)
	}, [apiConfiguration])

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
			<div className="dropdown-container">
				<label htmlFor="api-provider">
					<span style={{ fontWeight: 500 }}>API Provider</span>
				</label>
				<VSCodeDropdown
					id="api-provider"
					value={selectedProvider}
					onChange={handleInputChange("apiProvider")}
					style={{ minWidth: 130 }}>
					<VSCodeOption value="custom">Custom</VSCodeOption>
				</VSCodeDropdown>
			</div>

			{selectedProvider === "custom" && (
				<div>
					<VSCodeTextField
						value={apiConfiguration?.openAiBaseUrl || ""}
						style={{ width: "100%" }}
						type="url"
						onInput={handleInputChange("openAiBaseUrl")}
						placeholder="http://localhost:1940/query">
						<span style={{ fontWeight: 500 }}>Endpoint URL</span>
					</VSCodeTextField>
					<VSCodeTextField
						value={apiConfiguration?.requestBody || ""}
						style={{ width: "100%" }}
						onInput={handleInputChange("requestBody")}
						placeholder='{ "query": "<data>" }'>
						<span style={{ fontWeight: 500 }}>Request Body Format</span>
					</VSCodeTextField>
					<VSCodeTextField
						value={apiConfiguration?.responseBody || ""}
						style={{ width: "100%" }}
						onInput={handleInputChange("responseBody")}
						placeholder='{ "prediction": "<data>" }'>
						<span style={{ fontWeight: 500 }}>Response Body Format</span>
					</VSCodeTextField>
					<VSCodeTextField
						value={apiConfiguration?.temperature || ""}
						style={{ width: "100%" }}
						type="number"
						min="0"
						max="1"
						step="0.1"
						onInput={handleInputChange("temperature")}
						placeholder="0.7">
						<span style={{ fontWeight: 500 }}>Temperature</span>
					</VSCodeTextField>
				</div>
			)}

			{apiErrorMessage && (
				<p
					style={{
						margin: "-10px 0 4px 0",
						fontSize: 12,
						color: "var(--vscode-errorForeground)",
					}}>
					{apiErrorMessage}
				</p>
			)}

			{modelIdErrorMessage && (
				<p
					style={{
						margin: "-10px 0 4px 0",
						fontSize: 12,
						color: "var(--vscode-errorForeground)",
					}}>
					{modelIdErrorMessage}
				</p>
			)}
		</div>
	)
}

export function normalizeApiConfiguration(apiConfiguration?: ApiConfiguration) {
	const provider = apiConfiguration?.apiProvider || "custom"
	return {
		selectedProvider: provider,
		selectedModelId: "",
		selectedModelInfo: {
			maxTokens: -1,
			contextWindow: 4096,
			supportsImages: false,
			supportsPromptCache: false,
			inputPrice: 0,
			outputPrice: 0,
		} as ModelInfo,
	}
}

export default memo(ApiOptions)
