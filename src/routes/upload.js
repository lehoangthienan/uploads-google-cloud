import { Router } from 'express'

import * as gc from '../controllers/gc'

/*
  Create,      /
  Delete,     / An Le
  Directory  /
*/

const routes = new Router()

routes.post('/', gc.uploadImageToGoogleCloud)
routes.post('/url', gc.uploadImageUrlToGoogleCloud)
routes.post('/directory', gc.uploadDirectoryToGoogleCloud)
routes.delete('/:fileName', gc.deleteImageGoogleCloud)

export default routes

/*
  Create,      /
  Delete,     / An Le
  Directory  /
*/