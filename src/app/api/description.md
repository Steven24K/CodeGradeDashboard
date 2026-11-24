From the CodeGrade API we need 3 requests in order to get detailed information about student progress and analytics.

From the start, all methods need a Authorization Header with a bearer token. To not over complicate this just create
a text box where the teacher can set their Bearer token and save it in the state or browser cookies. 

Make the requests in the nextjs backend. 

The first method includes: GET https://app.codegra.de/api/v1/courses/ 
To get all courses from a teacher. Relevant fields only id and name. 

Second method: GET https://app.codegra.de/api/v1/courses/<COURSE_ID>/assignments/
Get all assignments by course id. Also only id and name are the relevant fields for us at the moment. 
Only tricky part to simulate the scroll on the website we need to grab the Next-Token from the response header 
and execute multiple requests to get all the assignments per course.

The last assignment is where we generate the gradebook, usually CodeGrade uses these methods to generate the CSV. 
GET https://app.codegra.de/api/v1/assignments/<ASSIGNMENT_ID>/grades/ 

So we can only get all the grades per assignment, so we need to make this request for all assignments downloaded from the previous requests. 

The response includes the following JSON as an array with only these relevant fiels
```json
[
 {
        "user": {
            "id": 495251, // <- Internal CodeGrade ID will be used in later feauters and iterations>
            "username": "<STUDENT_NUMBER",
            "name": "Firstname Lastname (Student number)",
        },
        "grade": {
            "grade": 10.0
        }
    }, 
    ...
    ...
    ...
    etc.
]
```

On the API tab page of this site I want a first step where the user will be prompted to insert their Bearer token, when click on submit or enter, It will just show a list of all courses. When selected a course it will immidiatly start making the other requests to get the full gradebook. Include all the features as in the CSV tab. Export the predicate functions and regex for the checks for the assignments and assessment ready. Also add a reload button to re-render data or refresh the token incase of expired. 


Error message shown when token is not valid status 401 unauthorized
```json
{
    "message": "You need to be logged in to do this.",
    "description": "No user was logged in.",
    "request_id": "01M85187KT0ZCDMR9B15TR3HFA",
    "code": "NOT_LOGGED_IN"
}
```