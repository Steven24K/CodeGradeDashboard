"use client"
import React, { useState } from "react"
import { Option, None, Some, visitOption } from "@/utils/Option"
import { FileInput } from "./components/FileInput"
import { StudentTable } from "./components/StudentTable"

export interface AppState {
    data: Option<string>
}

const zeroAppState = (): AppState => ({
    data: None()
})

const setData = (_raw: string) => (s: AppState): AppState => ({
    ...s, data: Some(_raw)
})

export const App = () => {
    const [state, setState] = useState<AppState>(zeroAppState)

    return visitOption<string, React.JSX.Element>
        (text => <StudentTable content={text} />)
        (() => <FileInput onFileLoad={content => setState(setData(content))} />)
        (state.data)
}