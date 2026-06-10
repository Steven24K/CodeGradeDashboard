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


const FilterProblems = (e: Exercise) => e.Title.match(/^([A])[0-9]W[0-9]+[P][0-9]+/)
const FilterAssignments = (e: Exercise) => e.Title.match(/^([A])[0-9]W[0-9]+[A][0-9]+/)
const FilterOptional = (e: Exercise) => e.Title.match(/^([A])[0-9]W[0-9]+[O][0-9]+/)
const FilterMaster = (e: Exercise) => e.Title.match(/^([A])[0-9]W[0-9]+[M][0-9]+/)

const isCompleted = (a: number): boolean => a != 0
const toScore = (a: Exercise): number => a.Score

type SortBy = 'name' | 'problems' | 'assignment' | 'optional' | 'grade' | 'avg_grade_cumulative'
type SortDirection = 'ASC' | 'DESC'

const sortStudents = (sortBy: SortBy) => (dir: SortDirection) => (a: Student, b: Student) => {
    if (dir == 'ASC') {
        if (sortBy == 'problems') {
            const A = a.Exercises.filter(FilterProblems).map(toScore).filter(isCompleted).length
            const B = b.Exercises.filter(FilterProblems).map(toScore).filter(isCompleted).length
            return A - B
        }
        else if (sortBy == 'assignment') {
            const A = a.Exercises.filter(FilterAssignments).map(toScore).filter(isCompleted).length
            const B = b.Exercises.filter(FilterAssignments).map(toScore).filter(isCompleted).length
            return A - B
        }
        else if (sortBy == 'optional') {
            const A = a.Exercises.filter(FilterOptional).map(toScore).filter(isCompleted).length
            const B = b.Exercises.filter(FilterOptional).map(toScore).filter(isCompleted).length
            return A - B
        }
        else if (sortBy == 'grade') {
            const A = a.Exercises.map(toScore).filter(isCompleted)
            const B = b.Exercises.map(toScore).filter(isCompleted)
            const avg_A = (sum(A) / A.length)
            const avg_B = (sum(B) / B.length)
            return avg_A - avg_B
        }
        else if (sortBy == 'avg_grade_cumulative') {
            const A = a.Exercises.map(toScore)
            const B = b.Exercises.map(toScore)
            const avg_A = (sum(A) / A.length)
            const avg_B = (sum(B) / B.length)
            return avg_A - avg_B
        }
        // name
        return a.Name.charCodeAt(0) - b.Name.charCodeAt(0)
    } else {
        if (sortBy == 'problems') {
            const A = a.Exercises.filter(FilterProblems).map(toScore).filter(isCompleted).length
            const B = b.Exercises.filter(FilterProblems).map(toScore).filter(isCompleted).length
            return B - A
        }
        else if (sortBy == 'assignment') {
            const A = a.Exercises.filter(FilterAssignments).map(toScore).filter(isCompleted).length
            const B = b.Exercises.filter(FilterAssignments).map(toScore).filter(isCompleted).length
            return B - A
        }
        else if (sortBy == 'optional') {
            const A = a.Exercises.filter(FilterOptional).map(toScore).filter(isCompleted).length
            const B = b.Exercises.filter(FilterOptional).map(toScore).filter(isCompleted).length
            return B - A
        }
        else if (sortBy == 'grade') {
            const A = a.Exercises.map(toScore).filter(isCompleted)
            const B = b.Exercises.map(toScore).filter(isCompleted)
            const avg_A = (sum(A) / A.length)
            const avg_B = (sum(B) / B.length)
            return avg_B - avg_A
        }
        else if (sortBy == 'avg_grade_cumulative') {
            const A = a.Exercises.map(toScore)
            const B = b.Exercises.map(toScore)
            const avg_A = (sum(A) / A.length)
            const avg_B = (sum(B) / B.length)
            return avg_B - avg_A
        }
        // name
        return b.Name.charCodeAt(0) - a.Name.charCodeAt(0)
    }
}


interface StudentTableState {
    selectedStudentId: Option<string>
    sortBy: SortBy
    sortDirection: SortDirection
}

const zeroStudentTableState = (): StudentTableState => ({
    selectedStudentId: None(),
    sortBy: 'name',
    sortDirection: 'ASC'
})

interface StudentTableProps {
    content: string
}

export const StudentTable: FC<StudentTableProps> = props => {
    let rows = getRows(props.content)
    let students = parseRows(rows)

    const [state, setState] = useState<StudentTableState>(zeroStudentTableState)

    const toggleStudentDetails = (id: string) => (s: StudentTableState): StudentTableState =>
        visitOption<string, StudentTableState>(v => ({ ...s, selectedStudentId: v == id ? None() : Some(id) }))
            (() => ({ ...s, selectedStudentId: Some(id) }))
            (s.selectedStudentId)

    const setAndToggleSort = (_sortBy: SortBy) => (s: StudentTableState): StudentTableState =>
        ({ ...s, sortBy: _sortBy, sortDirection: s.sortDirection == 'ASC' ? 'DESC' : 'ASC' })

    return <table className="main-table">
        <thead className="main-table__head">
            <tr className="main-table__header-row">
                <th className="main-table__header-cell">Id</th>
                <th className="main-table__header-cell cursor-pointer" onClick={() => setState(setAndToggleSort('name'))}>Name</th>
                <th className="main-table__header-cell cursor-pointer" onClick={() => setState(setAndToggleSort('problems'))}>Problem Count</th>
                <th className="main-table__header-cell cursor-pointer" onClick={() => setState(setAndToggleSort('assignment'))}>Assignment Count</th>
                <th className="main-table__header-cell cursor-pointer" onClick={() => setState(setAndToggleSort('optional'))}>Optional</th>
                <th className="main-table__header-cell">Master Assignment</th>
                <th className="main-table__header-cell cursor-pointer" onClick={() => setState(setAndToggleSort('grade'))}>Avg. Grade</th>
                <th className="main-table__header-cell cursor-pointer" onClick={() => setState(setAndToggleSort('avg_grade_cumulative'))}>Avg. Grade cumulative</th>
            </tr>
        </thead>
        <tbody className="main-table__body">
            {students
                .sort(sortStudents(state.sortBy)(state.sortDirection))
                .map(student => {
                    const exercises = student.Exercises

                    const problems = exercises.filter(FilterProblems)
                    const problemsCompleted = problems.map(toScore).filter(isCompleted)

                    const assigmnents = exercises.filter(FilterAssignments)
                    const assigments_completed = assigmnents.map(toScore).filter(isCompleted)

                    const optional = exercises.filter(FilterOptional)
                    const optionalCompleted = optional.map(toScore).filter(isCompleted)

                    const master = exercises.filter(FilterMaster)
                    const masterCompleted = master.map(toScore).filter(isCompleted)
                    const masterCheck = masterCompleted.length == master.length ? "yes" : "no"

                    const allScores = exercises.map(toScore)
                    const exercisesCompleted = allScores.filter(isCompleted)
                    const avg_grade = (sum(exercisesCompleted) / exercisesCompleted.length).toFixed(1)
                    const avg_grade_cumulative = (sum(allScores) / allScores.length).toFixed(1)

                    const showDetails = visitOption<string, boolean>(v => v == student.Id)(() => false)(state.selectedStudentId)

                    return <tr onClick={() => setState(toggleStudentDetails(student.Id))} key={student.Id} className="main-table__row cursor-pointer">
                        <td className="main-table__cell main-table__cell--id">{student.Id}</td>
                        <td className="main-table__cell main-table__cell--name">{student.Name}</td>
                        <td className="main-table__cell main-table__cell--score">{problemsCompleted.length}/{problems.length}</td>
                        <td className="main-table__cell main-table__cell--score">{assigments_completed.length + 1}/{assigmnents.length}</td>
                        <td className="main-table__cell main-table__cell--score">{optionalCompleted.length}/{optional.length}</td>
                        <td className="main-table__cell main-table__cell--score">{masterCheck}</td>
                        <td className="main-table__cell main-table__cell--score">{avg_grade}</td>
                        <td className="main-table__cell main-table__cell--score">{avg_grade_cumulative}</td>
                        {showDetails && <td className="absolute top-0 left-0 bg-white w-full">
                            <span className="absolute top-2 right-5 text-xl">❌</span>
                            <h1 className="text-2xl mx-12 my-2 underline underline-offset-8">{student.Name}</h1>
                            <ul className="mx-12">
                                <li><b>Assignments:</b> {assigments_completed.length}/{assigmnents.length}</li>
                                <li><b>Problems:</b> {problemsCompleted.length}/{problems.length}</li>
                                <li><b>Optional:</b> {optionalCompleted.length}/{optional.length}</li>
                                <li><b>Master Assignment:</b> {masterCheck}</li>
                                <li><b>Avg. Grade:</b> {avg_grade}</li>
                                <li><b>Avg. Grade cumulative:</b> {avg_grade_cumulative}</li>
                            </ul>
                            <ul className="mx-10 my-4 sm:w-full md:w-1/2 lg:w-1/3">
                                {
                                    student.Exercises
                                        .map(e =>
                                            <li key={e.Title} className={`p-2 my-2 border-2 ${e.Score < 5.5 ? 'border-red-800' : 'border-green-600'}`}>
                                                <b>{e.Title}:</b> {e.Score > 0 && !e.Title.startsWith("A1W3A1") ? e.Score.toFixed(1) : "-"}
                                            </li>)
                                }
                            </ul>
                        </td>}
                    </tr>
                })}
        </tbody>
    </table>
}