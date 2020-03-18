import { Storage } from '@google-cloud/storage'
import axios from 'axios'
import loGet from 'lodash/get'
import path from 'path'
import sharp from 'sharp'
import fs from 'fs'

import {
    IMAGE_SIZE,
    GCS_URL,
} from './constants'
import {
    changeAlias,
} from './commons'
import config from '../configs'

const storage = new Storage({
    projectId: config.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: path.resolve(__dirname + '/configs/service_account_key-v1.json'),
})

const bucket = storage.bucket(config.GCS_BUCKET)

export const getPublicUrlGC = filename => `${GCS_URL}/${config.GCS_BUCKET}/${filename}`

const _handleUploadFile = data => {
    return Promise.all(IMAGE_SIZE.map(size => {
        return new Promise((resolve, reject) => {
            const gcsName = `${Date.now()}-${data.originalFilename}@${size.type}.${data.extension}`
            const gcsFile = bucket.file(gcsName)
            const gcsStream = gcsFile.createWriteStream({
                metadata: {
                    contentType: data.mimetype,
                },
                resumable: false,
            })
            sharp(data.localPath)
                .resize(size.value)
                .pipe(gcsStream)

            gcsStream.on('error', error => reject(error))

            gcsStream.on('finish', () => {
                gcsFile.makePublic()
                    .then(() => {
                        const urlObj = {}
                        urlObj[size.type] = gcsName
                        resolve(urlObj)
                    })
            })
        })
    }))
}

export const handleUploadFilesToGC = file =>
    new Promise((resolve, reject) => {
        Promise.all(file.data.map(_handleUploadFile))
            .then(urls => {
                const responseObj = {
                    field: file.field,
                    urls,
                }
                resolve(responseObj)
            })
            .catch(error => reject(error))
    })

export const uploadFromUrlToGCS = (url, filename = 'avatar') =>
    new Promise(async (resolve, reject) => {
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' })
            const buffer = loGet(response, ['data'], [])
            const contentType = loGet(response, ['headers', 'content-type'], '')
            const handledFilename = changeAlias(filename.trim().replace(/ /g, '-'))
            const data = {
                localPath: buffer,
                mimetype: contentType,
                originalFilename: handledFilename,
                extension: 'jpeg',
            }
            const urls = await _handleUploadFile(data)
            resolve(urls)
        } catch (error) {
            reject(error)
        }
    })

export const deleteFileFromGCS = filename =>
    new Promise((resolve, reject) => {
        bucket
            .file(filename)
            .delete()
            .then(result => resolve(result))
            .catch(error => reject(error))
    })

export const uploadDirectoryToGC = async (directoryPath) => {
    const pathDirName = path.dirname(directoryPath);

    await getFiles(directoryPath, pathDirName);
}

const getFiles = async (directory, pathDirName) => {
    let dirCtr = 1;
    let itemCtr = 0;
    const fileList = []

    const items = await fs.readdirSync(directory)
    dirCtr--;
    itemCtr += items.length;

    for (let i = 0; i < items.length; i++) {
        const fullPath = path.join(directory, items[i]);
        const stat = await fs.statSync(fullPath)
        itemCtr--;
        if (stat.isFile()) {
            fileList.push(fullPath);
        } else if (stat.isDirectory()) {
            dirCtr++;
            getFiles(fullPath);
        }
        if (dirCtr === 0 && itemCtr === 0) {
            await onCompleteUploadDirectoryToGC(fileList, pathDirName);
        }
    }
}

const onCompleteUploadDirectoryToGC = async (fileList, pathDirName) => {
    console.log(fileList, pathDirName)
    const resp = await Promise.all(
        fileList.map(filePath => {
            let destination = path.relative(pathDirName, filePath);
            return storage
                .bucket(config.GCS_BUCKET)
                .upload(filePath, { destination })
                .then(
                    uploadResp => ({ fileName: destination, status: uploadResp[0] }),
                    err => ({ fileName: destination, response: err })
                );
        })
    );

    const successfulUploads = fileList.length - resp.filter(r => r.status instanceof Error).length;

    console.log(`${successfulUploads} files uploaded to ${config.GCS_BUCKET} successfully.`)
}

/*
  Create,      /
  Delete,     / An Le
  Directory  /
*/