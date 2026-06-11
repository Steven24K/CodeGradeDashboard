"use client"
import { useState } from "react"
import { Option, None, Some, visitOption } from "@/utils/Option"
import { FileInput } from "./components/FileInput"
import { StudentTable } from "./components/StudentTable"

export interface Exercise {
    Title: string
    Score: number
}
export interface Student {
    Id: string
    Name: string
    Exercises: Exercise[]
}

type FileState =
    { kind: 'no-file' } |
    { kind: 'raw', content: string } |
    { kind: 'parsed', students: Student[] }

export type SortBy = 'name' | 'problems' | 'assignment' | 'optional' | 'grade' | 'avg_grade_cumulative'
export type SortDirection = 'ASC' | 'DESC'
export interface AppState {
    data: FileState
    selectedStudentId: Option<string>
    sortBy: SortBy
    sortDirection: SortDirection
}

const zeroAppState = (): AppState => ({
    data: { kind: 'no-file' },
    selectedStudentId: None(),
    sortBy: 'name',
    sortDirection: 'ASC'
})

const getRows = (_raw: string): string[] => _raw.split('\r\n')

const getCells = (_row: string): string[] => _row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)

const parseRows = (rows: string[]): Student[] => {
    let header = getCells(rows.shift()!).splice(2)
    return rows.map((row, i) => {
        let cells = getCells(row)
        return ({
            Id: cells[1],
            Name: cells[0],
            Exercises: cells.splice(2).map<Exercise>((score, i) => ({ Title: header[i], Score: Number(score) }))
        })
    })
}

const setData = (_incomming: FileState) => (s: AppState): AppState =>
    ({ ...s, data: _incomming })

const toggleStudentDetails = (id: string) => (s: AppState): AppState =>
    visitOption<string, AppState>
        (v => ({ ...s, selectedStudentId: v == id ? None() : Some(id) }))
        (() => ({ ...s, selectedStudentId: Some(id) }))
        (s.selectedStudentId)

const setAndToggleSort = (_sortBy: SortBy) => (s: AppState): AppState =>
    ({ ...s, sortBy: _sortBy, sortDirection: s.sortDirection == 'ASC' ? 'DESC' : 'ASC' })

export const App = () => {
    const [state, setState] = useState<AppState>(zeroAppState)

    if (state.data.kind == 'no-file') return <FileInput onFileLoad={raw => setState(setData({ kind: 'raw', content: raw }))} />

    if (state.data.kind == 'raw') {
        let rows = getRows(state.data.content)
        let students = parseRows(rows)
        setState(setData({ kind: 'parsed', students: students }))
        return "parsing..."
    }

    return <StudentTable
        students={state.data.students}
        setAndToggleSort={key => setState(setAndToggleSort(key))}
        toggleStudentDetails={id => setState(toggleStudentDetails(id))}
        {...state}
    />
}