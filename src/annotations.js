const {executeRequest, getUnitHeader} = require('./utility/delivery')
const xlsx = require('xlsx')

const records = []

const startFrom = {
    unitId: 126244, 
    name: 'Product Engineering', 
    type: 'PROGRAM'
}

// const startFrom = {
//     unitId: 40680, 
//     name: 'I&A', 
//     type: 'PROGRAM'
// }

const extractValue = (node, config) => {
    const card = node.cards.find(card => card.element.configuration.name == config)
    if(card && card.element.data) {
        const annotationJson = card.element.data.comment

        try {
            const annotation = JSON.parse(annotationJson)

            const textBlock = annotation.blocks.find(block => block.text)
    
            if (textBlock) {
                return textBlock.text
            }
   
        } catch (e) {
            //console.log('Bad JSON', annotationJson)

            return undefined
        }

    } else {
        // console.log('Perf link is missing:', elt.name)
        return undefined
    }
}

const processUnit = async (elt) => {
    const record = {id: elt.unitId, name: elt.name, type: elt.type}

    record.path = (await getUnitHeader(elt.unitId)).path

    // const details = await executeRequest('/v1/' + elt.unitId + '/views/summary')
    // const reporting = details.sections.find(section => section.title == 'Tags')

    // if(reporting) {
    //     record.perfLink = extractValue(reporting, 'PERF LINK')
    //     record.squadType = extractValue(reporting, 'SQUAD TYPE')
    // } else {
    //     //console.log('Tags section is missing:', elt.name)
    // }

    // if (record.type == 'PROJECT') {
    //     const unitDetails = await executeRequest('/v1/project/?id=4060741400388474403', 'https://delivery.epam.com/luminateto/projects.epam.com/api')

    //     console.log(unitDetails)
    // }
    
//    console.log(record.id, record.name, record.type, record.perfLink, record.squadType)
    console.log(record.id, record.name, record.type)

    records.push(record)

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

    const wb = xlsx.utils.book_new()
    const ws = xlsx.utils.json_to_sheet(records)
    xlsx.utils.book_append_sheet(wb, ws, 'data');
    xlsx.writeFile(wb, 'Annotations.xlsx');

})()