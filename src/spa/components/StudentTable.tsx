import { FC } from "react";
import { All } from "@/utils/Logic";
import { Option, visitOption } from "@/utils/Option";
import { Exercise, SortBy, SortDirection, Student } from "../App";

const isProblem = (e: Exercise) => e.Title.match(/^([A])[0-9]W[0-9]+[P][0-9]+/)
const isAssignment = (e: Exercise) => e.Title.match(/^([A])[0-9]W[0-9]+[A][0-9]+/)
const isOptional = (e: Exercise) => e.Title.match(/^([A])[0-9]W[0-9]+[O][0-9]+/)
const isMaster = (e: Exercise) => e.Title.match(/^([A])[0-9]W[0-9]+[M][0-9]+/)

const isCompleted = (e: Exercise): boolean => e.Score != 0 || e.Title == "A1W3A1 - Flowchart or pseudo-code"
const isGradeSufficient = (e: Exercise): boolean => e.Score >= 5.5
const toScore = (e: Exercise): number => e.Score

const sum = (n: number[]): number => n.reduce((acc, x) => acc + x, 0)
const getAvg = (scores: number[]): number => scores.length ? sum(scores) / scores.length : 0

const extractors: Record<SortBy, (s: Student) => number | string> = {
    name: (s: Student) => s.Name,
    problems: (s: Student) => s.Exercises.filter(All(isProblem, isCompleted)).map(toScore).length,
    assignment: (s: Student) => s.Exercises.filter(All(isAssignment, isCompleted)).map(toScore).length,
    optional: (s: Student) => s.Exercises.filter(All(isOptional, isCompleted)).map(toScore).length,
    master_grade: (s: Student) => s.Exercises.filter(isMaster)[0].Score,
    grade: (s: Student) => getAvg(s.Exercises.filter(isCompleted).map(toScore)),
    avg_grade_cumulative: (s: Student) => getAvg(s.Exercises.map(toScore)),
}

const sortStudents = (key: SortBy) => (dir: SortDirection) => (a: Student, b: Student) => {
    const sortBy = extractors[key]
    const valA = sortBy(a)
    const valB = sortBy(b)

    if (typeof valA === 'string' && typeof valB === 'string') {
        return dir === 'ASC' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    }

    return dir === 'ASC'
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number)
}

interface StudentTableProps {
    students: Student[]
    selectedStudentId: Option<string>
    sortBy: SortBy
    sortDirection: SortDirection
    setAndToggleSort: (key: SortBy) => void
    toggleStudentDetails: (id: string) => void
}

export const StudentTable: FC<StudentTableProps> = props => {


    return <table className="main-table">
        <thead className="main-table__head">
            <tr className="main-table__header-row">
                <th className="main-table__header-cell">Id</th>
                <th className="main-table__header-cell cursor-pointer" onClick={() => props.setAndToggleSort('name')}>Name</th>
                <th className="main-table__header-cell cursor-pointer" onClick={() => props.setAndToggleSort('problems')}>Problem Count</th>
                <th className="main-table__header-cell cursor-pointer" onClick={() => props.setAndToggleSort('assignment')}>Assignment Count</th>
                <th className="main-table__header-cell cursor-pointer" onClick={() => props.setAndToggleSort('optional')}>Optional</th>
                <th className="main-table__header-cell cursor-pointer" onClick={() => props.setAndToggleSort('master_grade')}>Master Assignment</th>
                <th className="main-table__header-cell cursor-pointer" onClick={() => props.setAndToggleSort('grade')}>Avg. Grade</th>
                <th className="main-table__header-cell cursor-pointer" onClick={() => props.setAndToggleSort('avg_grade_cumulative')}>Avg. Grade cumulative</th>
            </tr>
        </thead>
        <tbody className="main-table__body">
            {props.students
                .sort(sortStudents(props.sortBy)(props.sortDirection))
                .map(student => {
                    const exercises = student.Exercises

                    const problems = exercises.filter(isProblem)
                    const problemsCompleted = problems.filter(isCompleted).map(toScore)

                    const assigmnents = exercises.filter(isAssignment)
                    const assigments_completed = assigmnents.filter(isCompleted).map(toScore)

                    const optional = exercises.filter(isOptional)
                    const optionalCompleted = optional.filter(isCompleted).map(toScore)

                    const master = exercises.filter(isMaster)
                    const masterCompleted = master.filter(All(isCompleted, isGradeSufficient)).map(toScore)
                    const masterCheck = masterCompleted.length == master.length ? "✅" : "❌"

                    const allScores = exercises.map(toScore)
                    const exercisesCompleted = exercises.filter(isCompleted).map(toScore)
                    const avg_grade = getAvg(exercisesCompleted).toFixed(1)
                    const avg_grade_cumulative = getAvg(allScores).toFixed(1)

                    const showDetails = visitOption<string, boolean>(v => v == student.Id)(() => false)(props.selectedStudentId)

                    return <tr onClick={() => props.toggleStudentDetails(student.Id)} key={student.Id} className="main-table__row cursor-pointer">
                        <td className="main-table__cell main-table__cell--id">{student.Id}</td>
                        <td className="main-table__cell main-table__cell--name">{student.Name}</td>
                        <td className="main-table__cell main-table__cell--score">{problemsCompleted.length}/{problems.length}</td>
                        <td className="main-table__cell main-table__cell--score">{assigments_completed.length}/{assigmnents.length}</td>
                        <td className="main-table__cell main-table__cell--score">{optionalCompleted.length}/{optional.length}</td>
                        <td className="main-table__cell main-table__cell--score">{masterCheck}({master[0]?.Score.toFixed(1)})</td>
                        <td className="main-table__cell main-table__cell--score">{avg_grade}</td>
                        <td className="main-table__cell main-table__cell--score">{avg_grade_cumulative}</td>
                        {showDetails && <td className="absolute top-0 left-0 bg-white w-full">
                            <span className="absolute top-2 right-5 text-xl">❌</span>
                            <h1 className="text-2xl mx-12 my-2 underline underline-offset-8">{student.Name}</h1>
                            <ul className="mx-12">
                                <li><b>Assignments:</b> {assigments_completed.length}/{assigmnents.length}</li>
                                <li><b>Problems:</b> {problemsCompleted.length}/{problems.length}</li>
                                <li><b>Optional:</b> {optionalCompleted.length}/{optional.length}</li>
                                <li><b>Master Assignment:</b> {masterCheck}({master[0]?.Score.toFixed(1)})</li>
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