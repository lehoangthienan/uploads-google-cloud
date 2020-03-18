import loGet from 'lodash/get'
import formidable from 'formidable'

import ServerError from '../utils/serverError'
import logger from '../utils/logger'
import {
    getPublicUrlGC,
    handleUploadFilesToGC,
    uploadFromUrlToGCS,
    deleteFileFromGCS,
    uploadDirectoryToGC,
} from '../utils/googleClound'

/*
  Create,      /
  Delete,     / An Le
  Directory  /
*/

export async function uploadImageToGoogleCloud(req, res) {
    try {
        const files = []
        const form = new formidable.IncomingForm()
        form.multiples = true
        form
            .parse(req)
            .on('file', (field, file) => {
                const fileObj = { data: [] }
                const filename = loGet(file, ['name'], '')
                const filenameTail = filename.match(/[^.]+$/i)[0]
                const extension = file.type.match(/[^/]+$/i)[0]
                const originalFilename = filename.replace(`.${filenameTail}`, '')
                const fileData = {
                    filename,
                    originalFilename,
                    localPath: loGet(file, ['path'], ''),
                    mimetype: loGet(file, ['type'], ''),
                    size: loGet(file, ['size'], null),
                    extension,
                }
                fileObj.field = field
                fileObj.data.push(fileData)
                files.push(fileObj)
            })
            .on('end', async () => {
                if (files.length <= 0) throw new ServerError('No Files', 500)

                const cloudStoragePublicUrl = await Promise.all(files.map(handleUploadFilesToGC))

                res.status(200).json({
                    message: 'Success',
                    cloudStoragePublicUrl,
                    medium: getPublicUrlGC(loGet(cloudStoragePublicUrl, [0, 'urls', 0, 2, 'medium'], '')),
                    large: getPublicUrlGC(loGet(cloudStoragePublicUrl, [0, 'urls', 0, 3, 'large'], '')),
                    original: getPublicUrlGC(loGet(cloudStoragePublicUrl, [0, 'urls', 0, 4, 'original'], '')),
                })
            })

    } catch (err) {
        logger.error(err)
        res.status(err.code || 500).json({ message: err.message })
    }
}

export async function uploadImageUrlToGoogleCloud(req, res) {
    try {
        const { url } = req.body

        const urls = await uploadFromUrlToGCS(url)

        res.status(200).json({
            message: 'Success',
            urls,
            medium: getPublicUrlGC(loGet(urls, [2, 'medium'], '')),
            large: getPublicUrlGC(loGet(urls, [3, 'large'], '')),
            original: getPublicUrlGC(loGet(urls, [4, 'original'], '')),
        })

    } catch (err) {
        logger.error(err)
        res.status(err.code || 500).json({ message: err.message })
    }
}

export async function deleteImageGoogleCloud(req, res) {
    try {
        const { fileName } = req.params

        await deleteFileFromGCS(fileName)

        res.status(200).json({
            message: 'Success',
        })

    } catch (err) {
        logger.error(err)
        res.status(err.code || 500).json({ message: err.message })
    }
}

export async function uploadDirectoryToGoogleCloud(req, res) {
    try {
        const { directoryPath } = req.body

        await uploadDirectoryToGC(directoryPath)

        res.status(200).json({
            message: 'Success',
        })

    } catch (err) {
        logger.error(err)
        res.status(err.code || 500).json({ message: err.message })
    }
}

/*
  Create,      /
  Delete,     / An Le
  Directory  /
*/
