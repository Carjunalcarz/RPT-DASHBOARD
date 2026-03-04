const express = require('express');
const router = express.Router();
const buildingAppraisalService = require('../services/buildingAppraisalService');
const protect = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const getAppraisals = async (req, res, next) => {
  try {
    const { classificationCode, buildingType, buildingSubClass } = req.query;
    const data = await buildingAppraisalService.getAppraisals({ 
        classificationCode, 
        buildingType, 
        buildingSubClass 
    });
    
    res.status(200).json({
        success: true,
        data: data
    });
  } catch (error) {
    next(error);
  }
};

const getAllClassifications = async (req, res, next) => {
    try {
        const data = await buildingAppraisalService.getAllClassifications();
        res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        next(error);
    }
}

const createAppraisal = async (req, res, next) => {
    try {
        const data = await buildingAppraisalService.createAppraisal(req.body);
        res.status(201).json({
            success: true,
            data: data
        });
    } catch (error) {
        next(error);
    }
}

const updateAppraisal = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = await buildingAppraisalService.updateAppraisal(id, req.body);
        res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        next(error);
    }
}

const deleteAppraisal = async (req, res, next) => {
    try {
        const { id } = req.params;
        await buildingAppraisalService.deleteAppraisal(id);
        res.status(200).json({
            success: true,
            message: 'Appraisal deleted successfully'
        });
    } catch (error) {
        next(error);
    }
}

router.get('/', protect, getAppraisals);
router.get('/classifications', protect, getAllClassifications);
router.post('/', protect, createAppraisal);
router.put('/:id', protect, updateAppraisal);
router.delete('/:id', protect, deleteAppraisal);

module.exports = router;
