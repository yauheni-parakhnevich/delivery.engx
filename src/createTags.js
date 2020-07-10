const {executeRequest, getUnitHeader, executePost} = require('./utility/delivery')

// const startFrom = {
//     unitId: 40680, 
//     name: 'I&A', 
//     type: 'PROGRAM'
// }

const startFrom = {
    unitId: 126244, 
    name: 'PE', 
    type: 'PROGRAM'
}

const processUnit = async (elt) => {
    console.log(elt.unitId, elt.name)

    // const record = {id: elt.unitId, name: elt.name, type: elt.type}

    const summaryId = (await getUnitHeader(elt.unitId)).summaryId

    const details = await executeRequest('/v1/' + elt.unitId + '/views/summary')
    const reporting = details.sections.find(section => section.title == 'Tags')

    if(reporting) {
        // record.perfLink = extractValue(reporting, 'PERF LINK')
        // record.squadType = extractValue(reporting, 'SQUAD TYPE')

        let card = reporting.cards.find(card => card.element.configuration.name == 'PERF LINK')
        if (!card) {
            await executePost('/v1/' + elt.unitId + '/views/cards', {
                "containerId": reporting.id,
                "element": {
                    "configuration": {
                        "name": "PERF LINK"
                    },
                    "type": "ANNOTATION"
                }
            })    
        }        

        card = reporting.cards.find(card => card.element.configuration.name == 'SQUAD TYPE')
        if (!card) {
            await executePost('/v1/' + elt.unitId + '/views/cards', {
                "containerId": reporting.id,
                "element": {
                    "configuration": {
                        "name": "SQUAD TYPE"
                    },
                    "type": "ANNOTATION"
                }
            })    
        }        

        card = reporting.cards.find(card => card.element.configuration.name == 'SQUAD NAME')
        if (!card) {
            await executePost('/v1/' + elt.unitId + '/views/cards', {
                "containerId": reporting.id,
                "element": {
                    "configuration": {
                        "name": "SQUAD NAME"
                    },
                    "type": "ANNOTATION"
                }
            })    
        }        

    } else {
        // Create 'Tags' and 'PERF LINK'/'SQUAD TYPE'
        await executePost('/v1/' + elt.unitId + '/views/sections', {
            "containerId": summaryId,
            "title": "Tags"
        })

        // TODO: create cards
    }

    await processChildren(elt.unitId)
}

const processChildren = async (unitId) => {
    const tree = await executeRequest('/v1/' + unitId + '/treeview')

    let children = tree.treeViewElements
    children = children.filter(item => item.type != 'ASSIGNMENT')

    for(var i=0; i < children.length; i++) {
        const elt = children[i]

        await processUnit(elt)
    }
}

;(async () => {
    await processUnit(startFrom)
})()