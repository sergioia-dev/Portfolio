import { capitalizeFirstLetter } from "../../src/util/string_manipulation";

test("capitalizes the first letter and lowercases the rest", () => {
  expect(capitalizeFirstLetter("hello")).toBe("Hello");
  expect(capitalizeFirstLetter("hELLO")).toBe("Hello");
  expect(capitalizeFirstLetter("")).toBe("");
});
