const {executeRequest, getUnitHeader, executePost} = require('./utility/delivery')
const xlsx = require('xlsx')
const dateFormat = require('dateformat')

const records = []

const startFrom = {
    unitId: 22835, 
    name: 'Refinitiv', 
    type: 'CUSTOMER'
}

let scopeOfWork = []

// const startFrom = {
//     unitId: 40680, 
//     name: 'I&A', 
//     type: 'PROGRAM'
// }

const getArrayValues = (arr) => {
    let result = []

    arr.forEach((item) => {
        if (item.active) {
            result.push(item.name)
        }
    })

    return result.toString()
}

const processUnit = async (elt) => {
    const record = {id: elt.unitId, name: elt.name, type: elt.type}

    const unitHeader = await getUnitHeader(elt.unitId)
    record.path = unitHeader.path

    // Team details
    const teamDetails = await executePost('https://teams.delivery.epam.com/api/unit/' + unitHeader.externalId + '/resource_plan/general/hierarchy')

    if (teamDetails && teamDetails.length > 0) {
        if (teamDetails[0].keyStaff) {
            const manager = teamDetails[0].keyStaff.find((item) => {
                return item.role == 'Delivery Manager' || item.role == 'Stream Manager' || item.role == 'Program Manager'
            })

            if (manager) {
                record.manager = manager.name
            }
        }

        record.directMembers = teamDetails[0].membersDirectAmount
        record.totalMembers = teamDetails[0].membersTotalAmount
    }

    // Project attributes

    if(elt.type == 'PROJECT') {
        const projectDetails = await executeRequest('/v1/project/?id=' + unitHeader.externalId, 'https://projects.epam.com/api')

        record.workNatures = getArrayValues(projectDetails.workNatures)
        record.engagementModels = getArrayValues(projectDetails.engagementModels)
        record.environmentControls = getArrayValues(projectDetails.environmentControls)
        record.expectedTeamStructures = getArrayValues(projectDetails.expectedTeamStructures)

        const sow = projectDetails.scopeOfWorks
        sow.forEach((item) => {
            item.name = scopeOfWork.find(elt => elt.id == item.parentId).name + " - " + item.name
        })
    
        record.scopeOfWorks = getArrayValues(sow)
        record.deliveryApproaches = getArrayValues(projectDetails.deliveryApproaches)
        record.complianceRequirements = getArrayValues(projectDetails.complianceRequirements)

        // Risks
        const risks = await executeRequest(`/v1/${elt.unitId}/risks?limit=10&offset=0&saved=true`)

        if (risks.page && risks.page.length > 0) {
            const riskString = []

            for(i = 0; i < risks.page.length; i++) {
                const risk = risks.page[i]
                const str = `${risk.summary} [${risk.source}, ${risk.probability}, ${risk.state}]`

                riskString.push(str)
            }

            record.risks = riskString.join('\n')
        }

        // Issues
        const issues = await executeRequest(`/v1/${elt.unitId}/issues?limit=10&offset=0&saved=true`)

        if (issues.page && issues.page.length > 0) {
            const issueString = []

            for(i = 0; i < issues.page.length; i++) {
                const issue = issues.page[i]
                const str = `${issue.summary} [${issue.priority}, ${issue.state}]`

                issueString.push(str)
            }

            record.issues = issueString.join('\n')
        }
    }
    console.log(record.id, record.name, record.type)

    records.push(record)

    await processChildren(elt.unitId)
}

const processChildren = async (unitId) => {
    const tree = await executeRequest('/v1/' + unitId + '/treeview')

    let children = tree.treeViewElements
    children = children.filter((item) => {
        return item.type != 'ASSIGNMENT' && item.type != 'STREAM'
    })

    for(var i=0; i < children.length; i++) {
        const elt = children[i]

        await processUnit(elt)
    }
}

;(async () => {
    scopeOfWork = await executeRequest('/v1/scope-of-work/all?showInactive=true', 'https://projects.epam.com/api')

    await processUnit(startFrom)

    const wb = xlsx.utils.book_new()
    const ws = xlsx.utils.json_to_sheet(records)
    xlsx.utils.book_append_sheet(wb, ws, 'data');

    const now = new Date()
    const fileName = 'Project attributes_' + dateFormat(now, 'dd-mm-yy') + '.xlsx'
    xlsx.writeFile(wb, fileName);

    // const projectDetails = await executeRequest('/v1/project/?id=4060741400382639138', 'https://projects.epam.com/api')

    // console.log(getArrayValues(projectDetails.workNatures))
    // console.log(getArrayValues(projectDetails.engagementModels))
    // console.log(getArrayValues(projectDetails.environmentControls))
    // console.log(getArrayValues(projectDetails.expectedTeamStructures))
    // const sow = projectDetails.scopeOfWorks
    // sow.forEach((item) => {
    //     item.name = scopeOfWork.find(elt => elt.id == item.parentId).name + " - " + item.name
    // })

    // console.log(getArrayValues(sow))
    // console.log(getArrayValues(projectDetails.deliveryApproaches))
    // console.log(getArrayValues(projectDetails.complianceRequirements))

})()
