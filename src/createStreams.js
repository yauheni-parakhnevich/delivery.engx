const {executeRequest, getUnitHeader, executePost} = require('./utility/delivery')
const xlsx = require('xlsx')

// const startFrom = {
//     unitId: 40680, 
//     name: 'I&A', 
//     type: 'PROGRAM'
// }

const startFrom = {
    unitId: 40321, 
    name: 'Desktop', 
    type: 'PROGRAM'
}

let squads

const createAnnotation = async (unitId, tagsSection, tagName) => {
    const card = tagsSection.cards.find(card => card.element.configuration.name == tagName)
    if (!card) {
        await executePost('/v1/' + unitId + '/views/cards', {
            "containerId": tagsSection.id,
            "element": {
                "configuration": {
                    "name": tagName
                },
                "type": "ANNOTATION"
            }
        })    
    }        

}

const processUnit = async (elt) => {
    console.log(elt.unitId, elt.name)

    // const record = {id: elt.unitId, name: elt.name, type: elt.type}

    const unitHeader = await getUnitHeader(elt.unitId)
    const externalId = unitHeader.externalId
    // const summaryId = unitHeader.summaryId


    // Team details
    // const teamDetails = await executePost('https://teams.delivery.epam.com/api/unit/' + unitHeader.externalId + '/resource_plan/general/hierarchy')

    // let unitManager = ''

    // if (teamDetails && teamDetails.length > 0) {
    //     if (teamDetails[0].keyStaff) {
    //         const manager = teamDetails[0].keyStaff.find((item) => {
    //             return item.role == 'Delivery Manager' || item.role == 'Stream Manager' || item.role == 'Program Manager'
    //         })

    //         if (manager) {
    //             unitManager = manager
    //         }
    //     }

    // }

    //const details = await executeRequest('/v1/' + elt.unitId + '/views/summary')
    //let reporting = details.sections.find(section => section.title == 'Tags')

    // if(!reporting) {
    //     reporting = await executePost('/v1/' + elt.unitId + '/views/sections', {
    //         "containerId": summaryId,
    //         "title": "Tags"
    //     })
    // }

    // createAnnotation(elt.unitId, reporting, 'PERF LINK')
    // createAnnotation(elt.unitId, reporting, 'SQUAD TYPE')
    // createAnnotation(elt.unitId, reporting, 'SQUAD NAME')

    await processChildren(elt.unitId, elt.name, externalId)
}

const processChildren = async (unitId, unitName, externalId) => {

    console.log(`Processing unit ${unitId} ${unitName}`)
    
    const tree = await executeRequest('/v1/' + unitId + '/treeview')

    let children = tree.treeViewElements
    children = children.filter(item => item.type != 'ASSIGNMENT')
    //console.log('Got streams from DC', children)

    // expected list of children
    const projectStreams = squads.filter(item => item['Project'] == unitName)
    const streamsToCreate = []

    //console.log('Got streams from excel', projectStreams)

    projectStreams.forEach(element => {
        if (element['Delivery Stream'] != '') {
            if (!children.find(elt => elt.name.trim() == element['Delivery Stream'])) {
                streamsToCreate.push(element)
            }
        }
    });

    //console.log('Streams to be created', streamsToCreate)
    // Create streams
    for (i=0; i < streamsToCreate.length; i++) {
        elt = streamsToCreate[i]

        console.log('Creating stream', elt['Delivery Stream'])
        
        await executePost('https://projects.epam.com/api/v1/stream/acknowledged', {
            "name": elt['Delivery Stream'],
            "streamStatus": {
                "_value": "ACTIVE"
            },
            "parent": {
                "nodeId": `${externalId}@PROJECT`
            }            
        })

    }
    // children.push

    for(var i=0; i < children.length; i++) {
        const elt = children[i]

        await processUnit(elt)
    }
}

;(async () => {
    const squadsBook = xlsx.readFile('./EPAM Desktop projects-squads.xlsx')
    squads = xlsx.utils.sheet_to_json(squadsBook.Sheets['Summary'])

    await processUnit(startFrom)
})()