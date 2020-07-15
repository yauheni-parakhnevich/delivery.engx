const request = require('request-promise-native')

const clientId = process.env.clientId
const clientSecret = process.env.clientSecret
const userName = process.env.apiUser
const userPassword = process.env.password

let auth = {}

const executePut = async (url, body) => {
    if (!auth.jwtToken) {
        await authenticate()
    }

    const result = await request.put('https://delivery.epam.com' + url, {
        auth: {
            bearer: auth.jwtToken
        },
        headers: {
            'lum-api-token': auth.accessToken
        },
        body,
        json: true
    })   

    return result
}

const executePost = async (url, body) => {
    if (!auth.jwtToken) {
        await authenticate()
    }

    if (url && !url.startsWith('http')) {
        url = 'https://delivery.epam.com' + url
    }

    try {
        const result = await request.post(url, {
            auth: {
                bearer: auth.jwtToken
            },
            headers: {
                'lum-api-token': auth.accessToken
            },
            body,
            json: true
        })   

        return result          

    } catch (e) {
        console.log(e)

        return undefined
    }
}

const executeRequest = async (url, baseUrl = 'https://delivery.epam.com') => {

    if (!auth.jwtToken) {
        await authenticate()
    }
    const result = await request.get(baseUrl + url, {
        auth: {
            bearer: auth.jwtToken
        },
        headers: {
            'lum-api-token': auth.accessToken
        },
        json: true
    })   

    return result          
}

const authenticate = async () => {
    const response = await request.post('https://api.epam.luminatesec.com/v1/oauth/token', {
        auth: {
            'user': clientId,
            'pass': clientSecret
        },
        json: true
    })

    const accessToken = response.access_token

    const jwtToken = await request.post('https://perf.delivery.epam.com/api/v2/sso/token', {
        form: {
            'username': userName,
            'password': userPassword
        },
        headers: {
            'lum-api-token': accessToken
        }
    })

    auth.accessToken = accessToken
    auth.jwtToken = jwtToken
}

const getUnitHeader = async (id) => {
    const details = await executeRequest('/v1/' + id + '/navigation/unitHeader')

    const path = details.breadcrumbs.path

    let pathString = ''

    if (path) {
        path.forEach((item) => {
            pathString += '/' + item.name
        })
    }

    const externalId = details.currentUnit.externalId

    const summaryId = details.pages.find(page => page.pageType == 'summary').id

    const originalName = details.breadcrumbs.originalName

    return {path: pathString, externalId, summaryId, originalName}
}

module.exports = {
    executeRequest,
    getUnitHeader,
    executePost,
    executePut
}