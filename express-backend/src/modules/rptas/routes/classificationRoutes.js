const express = require('express');
const router = express.Router();
const classificationController = require('../controllers/classificationController');
const mainClassCustomController = require('../controllers/mainClassCustomController');
const protect = require('../../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Classifications
 *   description: Property Classification Management
 */

/**
 * @swagger
 * /api/classifications:
 *   get:
 *     summary: Get all classifications
 *     tags: [Classifications]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of classifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   Code:
 *                     type: string
 *                   Description:
 *                     type: string
 *   post:
 *     summary: Create a classification
 *     tags: [Classifications]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Code
 *             properties:
 *               Code:
 *                 type: string
 *               Description:
 *                 type: string
 *               OrderKey:
 *                 type: integer
 *               Grp:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created successfully
 */
router.get('/', protect, classificationController.getAll);
router.post('/', protect, classificationController.create);

router.get('/custom', protect, (req, res, next) => mainClassCustomController.list(req, res, next));
router.post('/custom', protect, (req, res, next) => mainClassCustomController.upsert(req, res, next));
router.delete('/custom/:code', protect, (req, res, next) => mainClassCustomController.delete(req, res, next));

/**
 * @swagger
 * /api/classifications/{code}:
 *   get:
 *     summary: Get a classification by Code
 *     tags: [Classifications]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Classification details
 *       404:
 *         description: Not found
 *   put:
 *     summary: Update a classification
 *     tags: [Classifications]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Description:
 *                 type: string
 *               OrderKey:
 *                 type: integer
 *               Grp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated successfully
 *   delete:
 *     summary: Delete a classification
 *     tags: [Classifications]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
router.get('/:code', protect, classificationController.getOne);
router.put('/:code', protect, classificationController.update);
router.delete('/:code', protect, classificationController.delete);

/**
 * @swagger
 * /api/classifications/{code}/full:
 *   get:
 *     summary: Get classification with related ActualUses and SubClasses
 *     tags: [Classifications]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Full classification details
 */
router.get('/:code/full', protect, classificationController.getFull);

module.exports = router;
