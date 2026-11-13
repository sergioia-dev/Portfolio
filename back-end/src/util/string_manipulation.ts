function capitalizeFirstLetter(val: string): string {
  val = val.toLowerCase();
  return val.charAt(0).toUpperCase() + val.slice(1);
}

export { capitalizeFirstLetter };
