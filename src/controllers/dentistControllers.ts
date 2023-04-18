import express from 'express';
import asyncHandler from 'express-async-handler';
import _ from 'lodash';

import Dentist from '../models/dentist';
import Patient from '../models/patient';
import { patientValidation } from '../middlewares/validateData';
import { generateUserName } from '../helpers/generateUserName';
import { calculateAge } from '../helpers/calculateAge';

export const addPatient = asyncHandler(async (req: express.Request, res: express.Response) => {
    const dentistId = req.dentistId;
    let patient = req.body;

    const error = patientValidation(patient);
    if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
    }

    const dentist = await Dentist.findById(dentistId);

    const patientExists = _.find(dentist.patients, (patient) => patient.patientClinicId === patient.clinicId);
    if (patientExists) {
        res.status(400).json({ error: 'Patient clinic id already exists.' });
        return;
    }

    patient.userName = generateUserName(patient.firstName, patient.middleName, patient.lastName);
    patient.age = calculateAge(patient.birthDate);
    patient = await Patient.create(patient);
    dentist.patients.push({
        patientId: patient._id,
        patientName: patient.userName,
        patientClinicId: patient.clinicId,
    });
    await dentist.save();

    res.json(patient);
    return;
});

export const getPatient = asyncHandler(async (req: express.Request, res: express.Response) => {
    const dentistId = req.dentistId;
    const { patientClinicId } = req.params;

    const dentist = await Dentist.findById(dentistId);
    const found = _.find(dentist.patients, (patient) => patient.patientClinicId === Number(patientClinicId));
    if (!found) {
        res.status(401).json('Wrong patient clinic id.');
        return;
    }
    const patient = await Patient.findOne({ clinicId: patientClinicId });
    res.json(patient);
    return;
});

export const editPatient = asyncHandler(async (req: express.Request, res: express.Response) => {
    const dentistId = req.dentistId;
    const { patientClinicId } = req.params;

    const dentist = await Dentist.findById(dentistId);
    const patientIndex = _.findIndex(
        dentist.patients,
        (patient: { patientClinicId: number }) => patient.patientClinicId === Number(patientClinicId),
    );

    if (patientIndex === -1) {
        res.status(401).json('Wrong patient clinic id.');
        return;
    }

    const patient = await Patient.findOne({ clinicId: patientClinicId });
    const updates = req.body;
    const updatedPatient = {
        ...patient.toObject(),
        ...updates,
    };
    updatedPatient.userName = generateUserName(
        updatedPatient.firstName,
        updatedPatient.middleName,
        updatedPatient.lastName,
    );
    await Patient.updateOne({ _id: patient._id }, updatedPatient);
    dentist.patients[patientIndex].patientName = updatedPatient.userName;
    await dentist.save();

    res.json(updatedPatient);
    return;
});
