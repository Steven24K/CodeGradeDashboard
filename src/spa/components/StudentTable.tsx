import { None, Option, Some, visitOption } from "@/utils/Option";
import { FC, useState } from "react";

interface Exercise {
    Title: string
    Score: number
}
interface Student {
    Id: string
    Name: string
    Exercises: Exercise[]
}

const getRows = (_raw: string): string[] => _raw.split('\r\n')

const getCells = (_row: string): string[] => _row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)

const getHeaders = (_rows: string[]): string[] => getCells(_rows[0])

const sum = (n: number[]): number => n.reduce((acc, x) => acc + x, 0)

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

interface StudentTableState {
    selectedStudentId: Option<string>
}

const zeroStudentTableState = (): StudentTableState => ({
    selectedStudentId: None()
})

interface StudentTableProps {
    content: string
}

export const StudentTable: FC<StudentTableProps> = props => {
    let rows = getRows(props.content)
    let headers = getHeaders(rows)
    let students = parseRows(rows)


    const [state, setState] = useState<StudentTableState>(zeroStudentTableState)

    const toggleStudentDetails = (id: string) => (s: StudentTableState): StudentTableState =>
        visitOption<string, StudentTableState>(v => ({ ...s, selectedStudentId: v == id ? None() : Some(id) }))
            (() => ({ ...s, selectedStudentId: Some(id) }))
            (s.selectedStudentId)

    const closeStudentDetails = (s: StudentTableState): StudentTableState =>
        ({ ...s, selectedStudentId: None() })

    return <table className="main-table">
        <thead className="main-table__head">
            <tr className="main-table__header-row">
                {headers.slice(0, 2).map(h => (
                    <th key={h} className="main-table__header-cell">
                        {h}
                    </th>
                ))}
                <th>Problem Count</th>
                <th>Assignment Count</th>
                <th>Optional</th>
                <th>Master Assignment</th>
                <th>Avg. Grade</th>
            </tr>
        </thead>
        <tbody className="main-table__body">
            {students
            .sort((a, b) => a.Name.charCodeAt(0) - b.Name.charCodeAt(0))
            .map(student => {
                const isCompleted = (a: number): boolean => a != 0
                const toScore = (a: Exercise): number => a.Score

                const exercises = student.Exercises

                const problems = exercises.filter(a => a.Title.match(/^([A])[0-9]W[0-9]+[P][0-9]+/))
                const problemsCompleted = problems.map(toScore).filter(isCompleted)

                const assigmnents = exercises.filter(a => a.Title.match(/^([A])[0-9]W[0-9]+[A][0-9]+/))
                const assigments_completed = assigmnents.map(toScore).filter(isCompleted)

                const optional = exercises.filter(a => a.Title.match(/^([A])[0-9]W[0-9]+[O][0-9]+/))
                const optionalCompleted = optional.map(toScore).filter(isCompleted)

                const master = exercises.filter(a => a.Title.match(/^([A])[0-9]W[0-9]+[M][0-9]+/))
                const masterCompleted = master.map(toScore).filter(isCompleted)
                const masterCheck = masterCompleted.length == master.length ? "yes" : "no"

                const exercisesCompleted = exercises.map(toScore).filter(isCompleted)
                const avg_grade = (sum(exercisesCompleted) / exercisesCompleted.length).toFixed(1)
                // console.log(exercises)

                const showDetails = visitOption<string, boolean>(v => v == student.Id)(() => false)(state.selectedStudentId)

                return <>
                    <tr onClick={() => setState(toggleStudentDetails(student.Id))} key={student.Id} className="main-table__row">
                        <td className="main-table__cell main-table__cell--id">{student.Id}</td>
                        <td className="main-table__cell main-table__cell--name">{student.Name}</td>
                        <td className="main-table__cell main-table__cell--score">{problemsCompleted.length}/{problems.length}</td>
                        <td className="main-table__cell main-table__cell--score">{assigments_completed.length + 1}/{assigmnents.length}</td>
                        <td className="main-table__cell main-table__cell--score">{optionalCompleted.length}/{optional.length}</td>
                        <td className="main-table__cell main-table__cell--score">{masterCheck}</td>
                        <td className="main-table__cell main-table__cell--score">{avg_grade}</td>
                    </tr>
                    {showDetails && <div>
                        <ul>
                            {student.Exercises.map(e => <li key={e.Title}>
                                <b>{e.Title}:</b> {e.Score > 0 && !e.Title.startsWith("A1W3A1") ? e.Score.toFixed(1) : "-"}
                            </li>)}
                        </ul>
                        <button className="py-2 px-6 m-1 bg-blue-600 hover:bg-blue-300 text-amber-50" onClick={() => setState(closeStudentDetails)}>close</button>
                    </div>}
                </>
            })}
        </tbody>
    </table>
}