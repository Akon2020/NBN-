import { describe, it, expect, afterAll } from "vitest";
import {
  User,
  Person,
  EmployeeProfile,
  Service,
} from "../models/index.model.js";

const suffix = Date.now();
const createdPersonIds = [];
const createdEmployeeProfileIds = [];
const createdUserIds = [];

afterAll(async () => {
  if (createdEmployeeProfileIds.length) {
    await EmployeeProfile.destroy({
      where: { idEmployeeProfile: createdEmployeeProfileIds },
    });
  }
  if (createdPersonIds.length) {
    await Person.destroy({ where: { idPerson: createdPersonIds } });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("BACK-G04 - Organization", () => {
  it("un EmployeeProfile peut être créé sans User associé", async () => {
    const service = await Service.findOne({ where: { name: "Juridique" } });
    expect(service).toBeTruthy();

    const person = await Person.create({
      fullName: `Personne sans compte ${suffix}`,
      phone: "+243900000000",
    });
    createdPersonIds.push(person.idPerson);
    expect(person.idUser).toBeFalsy();

    const employeeProfile = await EmployeeProfile.create({
      idPerson: person.idPerson,
      idService: service.idService,
      status: "ACTIVE",
    });
    createdEmployeeProfileIds.push(employeeProfile.idEmployeeProfile);

    expect(employeeProfile.idEmployeeProfile).toBeTruthy();
  });

  it("un User consultant existe sans être un EmployeeProfile", async () => {
    const consultant = await User.create({
      fullName: `Consultant sans profil RH ${suffix}`,
      email: `consultant.org.${suffix}@nbn.test`,
      password: "hash-non-utilisé-ici",
      role: "consultant",
      status: "ACTIVE",
    });
    createdUserIds.push(consultant.idUser);

    const linkedPerson = await Person.findOne({
      where: { idUser: consultant.idUser },
    });
    expect(linkedPerson).toBeNull();
  });
});
