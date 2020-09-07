const request = require('request')
const _ = require('underscore')
const async = require('async')
const xlsx = require('xlsx')

const clientId = process.env.clientId
const clientSecret = process.env.clientSecret
const userName = process.env.apiUser
const userPassword = process.env.password

const records = []

//const startFrom = '40680' // I & A
const startFrom = '126244'// PE

const questions = [
    {'id': 'Q1' , 'title': 'Do you track requirements (user stories) as formal task to be done using task management system?'},
    {'id': 'Q2' , 'title': 'Do you have documented and followed Definition of Done for user stories?'},
    {'id': 'Q3' , 'title': 'Do you have documented technical non functional requirements?'},
    {'id': 'Q4' , 'title': 'Do you have a team level agreement about coding standards/guidelines that developers adhere to when writing source code?'},
    {'id': 'Q5' , 'title': 'Do you use static code analysis tool (e.g. SonarQube, FindBugs, EsLint)?'},
    {'id': 'Q6' , 'title': 'Do you run static code analysis tool as a part of Continuous Integration?'},
    {'id': 'Q7' , 'title': 'Does Continous Integration process fail if quality gate based on static code analysis rules is broken?'},
    {'id': 'Q8' , 'title': 'Do you have regular code review practice for all code in your project and documented outcomes?'},
    {'id': 'Q9' , 'title': 'Does every commit message contain reference to development task (user story) in project tracking system (e.g. Jira, Rally)?'},
    {'id': 'Q10' , 'title': 'Do you write unit tests while working on development task or user story development?'},
    {'id': 'Q11' , 'title': 'Do you measure unit test coverage as a part of Continuous Integration?'},
    {'id': 'Q12' , 'title': 'Do you break Continuous Integration build in case of unit test code coverage is not met?'},
    {'id': 'Q13' , 'title': 'Are you aware about secure development practices and apply them to your project?'},
    {'id': 'Q14' , 'title': 'Do you have at least a free  Static Application Security Testing tool(s) integrated into CI/CD?'},
    {'id': 'Q15' , 'title': 'Do you have at least a free Dynamic Application Security Testing  tool(s) integrated into CI/CD?'},
    {'id': 'Q16' , 'title': 'Do you have test automation except of unit testing (Integration, API, End-To-End, UI testing)?'},
    {'id': 'Q17' , 'title': 'Do you execute all test automation tests at least once in every iteration (e.g. 2 weeks sprint)?'},
    {'id': 'Q18' , 'title': 'Do you include automated smoke test in CI/CD pipeline? (smoke test run automatically for each new build)'},
    {'id': 'Q19' , 'title': 'Do you execute partial or full regression test automation suite at least daily and analyze its result?'},
    {'id': 'Q20' , 'title': 'Do you track all defects in dedicated tool (e.g. Jira, Rally, Bugzilla)?'},
    {'id': 'Q21' , 'title': 'Do you link defects  to particular user story/requirements?'},
    {'id': 'Q22' , 'title': 'Do you resolve all major and higher priority defects within 2 weeks?'},
    {'id': 'Q23' , 'title': 'Do you use quality metrics to improve your quality assuarance processes and practices? '},
    {'id': 'Q24' , 'title': 'Do you use dedicated tool to manage test cases (e.g. Test Rail, QA Space)?'},
    {'id': 'Q25' , 'title': 'Do you divide test cases by test suites (e.g. Smoke, Acceptance)?'},
    {'id': 'Q26' , 'title': 'Do you link every test case to specific requirements?'},
    {'id': 'Q27' , 'title': 'Do you have documented and up-to-date Test Strategy?'},
    {'id': 'Q28' , 'title': 'Do you test non-functional requirements (e.g.  stress testing, load testing, usability testing, security testing)?'},
    {'id': 'Q29' , 'title': 'Do you perform leaked defects root cause analysis on regular basis (defining the reasons why defects were leaked to UAT or Prod, e.g. no enough time to complete testing, regression, environment, data specific, missed in requirements, etc.)?'},
    {'id': 'Q30' , 'title': 'Do you produce potentially shippable product at the end of every sprint?'},
    {'id': 'Q31' , 'title': 'Do you use continuous integration server?'},
    {'id': 'Q32' , 'title': 'Is it possible to trace all production builds and release candidates to the source code revision?'},
    {'id': 'Q33' , 'title': 'Do you have automated scripts, triggred manually or automatically, to deploy application at least on development/QA environments?'},
    {'id': 'Q34' , 'title': 'Do you use dependency management tool (e.g. npm, maven, nuget)?'},
    {'id': 'Q35' , 'title': 'Do you have branching strategy (e.g. GitFlow)?'},
    {'id': 'Q36' , 'title': 'Do you have rules how to name release version (e.g. semantic versioning)?'},
    {'id': 'Q37' , 'title': 'Do you have a tested recovery strategy to rollback to the previous build in case of unsuccessfull release?'},
    {'id': 'Q38' , 'title': 'Do you publish your own artifacts in artifact management repository (e.g. Artifactory/Nexus)?'},
]

const getAccessToken = (clientId, clientSecret, callback) => {

    request.post('https://api.epam.luminatesec.com/v1/oauth/token', {
        auth: {
            'user': clientId,
            'pass': clientSecret
        },
        json: true
    }, (err, res, body) => {
        if(err) {
            callback(err, undefined);
        } else {
            const auth = body.access_token
  
            callback(undefined, auth)
        }
    })
}

const getJwtToken = ({userName, userPassword, accessToken}, callback) => {
    request.post('https://perf.delivery.epam.com/api/v2/sso/token', {
        form: {
            'username': userName,
            'password': userPassword
        },
        headers: {
            'lum-api-token': accessToken
        }
    }, (err, res, body) => {
        if(err) {
            callback(err, undefined);
        } else {        
            const jwtToken = body
            //console.log('JWT token: ' + jwtToken)

            callback(undefined, jwtToken)
        }
    })
}

const executeRequest = (url, auth, callback) => {
    request.get(url, {
        auth: {
            bearer: auth.jwtToken
        },
        headers: {
            'lum-api-token': auth.accessToken
        },
        json: true
    }, (err, res, body) => {
        if(err) {
            callback(err, undefined)
        }
        callback(undefined, body)
    })   
}

const processSurveyResult = (record, auth, callback) => {

    executeRequest('https://delivery.epam.com/v1/surveys/entities/' + record.surveyId, auth, (err, surveyResult) => {
        if(err) {
            console.log(err)
        } else {
            try{
                surveyResult.sections.forEach(section => {

                    section.questions.forEach(question => {
                        const answer = _.where(question.answer, {checked: true})[0]

                        // question id
//                        const questionId = _.where(questions, {title: question.title})[0].id
//                        record[questionId] = answer.title

                        record[question.title] = answer.title

                    })
                })
            } catch (e) {
                console.log('unable to parse survey: ' + record.surveyId)
            }
        }

        callback(undefined, record)
    })
}

const processSingleProject = (record, auth, callback) => {
    executeRequest('https://delivery.epam.com/v1/' + record.projectId + '/views/summary', auth, (err, result) => {
        if(err) {
            return console.log(err)
        }

        console.log('Processing node [' + record.projectId + '] ' + record.projectName)

        const summary = result

        const engX = _.union(
            _.where(summary.sections, {'title': 'EngX Certification Lite'}),
            _.where(summary.sections, {'title': 'EngX Certification'}))[0]
        if(engX) {
            const survey = _.where(engX.cards, {'title': 'EngX Certification Lite'})[0]
            const surveyId = survey.element.data.surveyEntityId

            if(survey.element.data.results.score) { // survey created, no results
                const resultLevel = survey.element.data.results.score.current

                // Getting the survey's details
                record.surveyId = surveyId
                record.resultLevel = resultLevel
    
                processSurveyResult(record, auth, (err, result) => {
                    callback(undefined, record)
                })
            } else {
                callback(undefined, record)
            }

        } else {
            callback(undefined, record)
            //console.log('Project id:' + projectId + ', survey id: empty')
        }
    })

}

const processChildren = (unit, auth, masterCallback) => {

    const unitId = unit.id

    executeRequest('https://delivery.epam.com/v1/' + unitId + '/treeview', auth, (err, result) => {
        if(err) {
            return console.log(err)
        }

        let children = result.treeViewElements

        //let children = result.filter(item => item.id != unitId)
        children = children.filter(item => item.type != 'ASSIGNMENT')

        async.each(children, (elt, callback) =>{

            const record = {projectId: elt.unitId, projectName: elt.name, parentId: unitId, path:unit.name, type: elt.type}

            async.parallel([
                (callback) => processSingleProject(record, auth, (err, result) => {
                    if(result.projectId) records.push(result)
                    callback(null, 1)
                }),
                (callback) => processChildren({id: record.projectId, name: `${unit.name}/${record.projectName}`}, auth, (err, result) => {
                    if(result.projectId) records.push(result)
                    callback(null, 2)
                })
            ], function(err, results) {
                callback()
            })
 
        }, (err) => {
            if( err ) {
                console.log('Failed');
            } else {
                masterCallback(undefined, records)
            }
        })
    })

}

getAccessToken(clientId, clientSecret, (err, accessToken) => {
    if(err) {
        return console.log(err)
    }

    getJwtToken({userName, userPassword, accessToken}, (err, jwtToken) => {
        if(err) {
            return console.log(err)
        }
        
        const auth = {accessToken, jwtToken}

        processChildren({id: startFrom, name: 'PE'}, auth, (err, result) => {
            if(err) {
                return console.log(err)
            }

            // Post-processing
            records.forEach(record => {
                const arr = record.path.split('/')

                if(arr.length > 1) {
                    record.level1 = arr[1]
                }

                if(arr.length > 2) {
                    record.level2 = arr[2]
                }
            })

            const wb = xlsx.utils.book_new()
            const ws = xlsx.utils.json_to_sheet(records)
            xlsx.utils.book_append_sheet(wb, ws, 'EngX Lite Survey');
            xlsx.writeFile(wb, 'EngX Lite Survey.xlsx');
        })

    })
})