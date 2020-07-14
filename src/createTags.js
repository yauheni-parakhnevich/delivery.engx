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

    const summaryId = (await getUnitHeader(elt.unitId)).summaryId

    const details = await executeRequest('/v1/' + elt.unitId + '/views/summary')
    let reporting = details.sections.find(section => section.title == 'Tags')

    if(!reporting) {
        reporting = await executePost('/v1/' + elt.unitId + '/views/sections', {
            "containerId": summaryId,
            "title": "Tags"
        })
    }

    createAnnotation(elt.unitId, reporting, 'PERF LINK')
    createAnnotation(elt.unitId, reporting, 'SQUAD TYPE')
    createAnnotation(elt.unitId, reporting, 'SQUAD NAME')

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