const {executeRequest, getUnitHeader, executePut} = require('./utility/delivery')
const xlsx = require('xlsx')

const records = []
let squads = []

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

// const startFrom = {
//     unitId: 39892, 
//     name: 'REFI-XADC', 
//     type: 'PROJECT'
// }

const extractValue = (node, config) => {
    const card = node.cards.find(card => card.element.configuration.name == config)

    const value = {}

    if(card && card.element.configuration) {
        value.id = card.element.configuration.id
    }

    if(card && card.element.data) {
        const annotationJson = card.element.data.comment

        try {
            const annotation = JSON.parse(annotationJson)

            const textBlock = annotation.blocks.find(block => block.text)
    
            if (textBlock) {
                value.text = textBlock.text
            }
   
        } catch (e) {
            // do nothing
        }

    }

    return value
}

const fillAnnotation = async (unitId, cardId, name, value) => {
    const annotationBody = {
        "name": name,
        "unitId": unitId,
        "comment": "{\"blocks\":[{\"key\":\"cfpj5\",\"text\":\"" + value + "\",\"type\":\"unstyled\",\"depth\":0,\"inlineStyleRanges\":[],\"entityRanges\":[],\"data\":{}}],\"entityMap\":{}}",
        "externalAccess": false,
        "id": cardId,
        "version": 1
    }

    return await executePut('/v1/' + unitId + '/annotations/' + cardId, annotationBody)
}

const processUnit = async (elt) => {
    const record = {id: elt.unitId, name: elt.name, type: elt.type, parentName: elt.parentName}

    console.log('Processing unit', record.id, record.name, record.type)

    record.path = (await getUnitHeader(elt.unitId)).path

    const details = await executeRequest('/v1/' + elt.unitId + '/views/summary')
    const reporting = details.sections.find(section => section.title == 'Tags')

    if(reporting) {
        record.perfLink = extractValue(reporting, 'PERF LINK')
        record.squadType = extractValue(reporting, 'SQUAD TYPE')
        record.squadName = extractValue(reporting, 'SQUAD NAME')
    } else {
        console.log('Tags section is missing:', elt.name)
    }

    if(record.perfLink.text) {
        console.log('Link found, skip', elt.name)
    }

    if(!record.perfLink.text && elt.type == 'PROJECT') {
        console.log('Empty PROJECT section, checking SQUADS')

        const squadFilter = squads.filter((squad) => {
            return squad['Epam SD Project'] == record.name
        })

        if(squadFilter && squadFilter.length > 0) {
            console.log('Records has been found')
            if(squadFilter.length == 1) {
                // only one, using on the project level
                console.log('Single record, updating the project', squadFilter[0]['REFI SQUAD'], squadFilter[0]['Perf link'])

                const refiSquadText = squadFilter[0]['REFI SQUAD']
                const perfLinkText = squadFilter[0]['Perf link']
                const squadTypeText = squadFilter[0]['EPAM ONLY'] == 'Yes' ? 'EPAM ONLY' : ''
                
                await fillAnnotation(record.id, record.perfLink.id, 'PERF LINK', perfLinkText)
                await fillAnnotation(record.id, record.squadType.id, 'SQUAD TYPE', squadTypeText)
                await fillAnnotation(record.id, record.squadName.id, 'SQUAD NAME', refiSquadText)

                // record.refiSquad = squadFilter[0]['REFI SQUAD']
                // record.perfLink = squadFilter[0]['Perf link']
                // record.squadType = squadFilter[0]['EPAM ONLY'] == 'Yes' ? 'EPAM ONLY' : 'Source: ' + squadFilter[0]['EPAM ONLY']
            } else {
                console.log('Multiple records:', squadFilter.length)
            }
        } else {
            console.log('Not found:', record.name)
        }
    }

    if(!record.perfLink.text && elt.type == 'STREAM') {
        console.log('Empty STREAM section, checking SQUADS with [',elt.parentName,',', elt.name,']')

        let squadFilter = squads.find((squad) => {
            return squad['Epam SD Project'] == elt.parentName && squad['Epam SD Stream'] == elt.name
        })

        if(squadFilter) {
            console.log('Record has been found', squadFilter['REFI SQUAD'], squadFilter['Perf link'])

            // record.refiSquad = squadFilter['REFI SQUAD']
            // record.perfLink = squadFilter['Perf link']
            // record.squadType = squadFilter['EPAM ONLY'] == 'Yes' ? 'EPAM ONLY' : 'Source: ' + squadFilter['EPAM ONLY']

            const refiSquadText = squadFilter['REFI SQUAD']
            const perfLinkText = squadFilter['Perf link']
            const squadTypeText = squadFilter['EPAM ONLY'] == 'Yes' ? 'EPAM ONLY' : ''
            
            await fillAnnotation(record.id, record.perfLink.id, 'PERF LINK', perfLinkText)
            await fillAnnotation(record.id, record.squadType.id, 'SQUAD TYPE', squadTypeText)
            await fillAnnotation(record.id, record.squadName.id, 'SQUAD NAME', refiSquadText)

        } else {
            console.log('Not found, trying combination Project - Refi Squad')

            squadFilter = squads.find((squad) => {
                return squad['Epam SD Project'] == elt.parentName && squad['REFI SQUAD'] == elt.name
            })

            if(squadFilter) {
                console.log('Record has been found', squadFilter['REFI SQUAD'], squadFilter['Perf link'])

                // record.refiSquad = squadFilter['REFI SQUAD']
                // record.perfLink = squadFilter['Perf link']
                // record.squadType = squadFilter['EPAM ONLY'] == 'Yes' ? 'EPAM ONLY' : 'Source: ' + squadFilter['EPAM ONLY']
                
                const refiSquadText = squadFilter['REFI SQUAD']
                const perfLinkText = squadFilter['Perf link']
                const squadTypeText = squadFilter['EPAM ONLY'] == 'Yes' ? 'EPAM ONLY' : ''
                
                await fillAnnotation(record.id, record.perfLink.id, 'PERF LINK', perfLinkText)
                await fillAnnotation(record.id, record.squadType.id, 'SQUAD TYPE', squadTypeText)
                await fillAnnotation(record.id, record.squadName.id, 'SQUAD NAME', refiSquadText)    
            } else {
                console.log('Finally not found:', record.name)
            }
        }
    }
 
    console.log('Done processing----------------------------------')

    records.push(record)

    await processChildren(elt.unitId, elt.name)
}

const processChildren = async (unitId, parentName) => {
    const tree = await executeRequest('/v1/' + unitId + '/treeview')

    let children = tree.treeViewElements
    children = children.filter(item => item.type != 'ASSIGNMENT')

    for(var i=0; i < children.length; i++) {
        const elt = children[i]
        elt.parentName = parentName

        await processUnit(elt)
    }
}

;(async () => {
    const squadsBook = xlsx.readFile('./REFI SQUADs.xlsx')
    squads = xlsx.utils.sheet_to_json(squadsBook.Sheets['Sheet1'])

    await processUnit(startFrom)

    // await fillAnnotation(126625, 9262, 'SQUAD TYPE', 'Test')

    // const wb = xlsx.utils.book_new()
    // const ws = xlsx.utils.json_to_sheet(records)
    // xlsx.utils.book_append_sheet(wb, ws, 'data');
    // xlsx.writeFile(wb, 'Annotations-checkpoint.xlsx');

})()