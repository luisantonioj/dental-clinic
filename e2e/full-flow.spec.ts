import { expect, type Page, test } from "@playwright/test";

const ADMIN = { email: "admin@e2e.test", password: "e2e-admin-password" };
const ANA = { name: "Dra. Ana Cruz", email: "ana@e2e.test", password: "ana-password-1" };
const OTHER = { name: "Dr. Ben Other", email: "ben@e2e.test", password: "ben-password-1" };

// 1×1 PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function signIn(page: Page, who: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await expect(page).toHaveURL(/\/login/);
}

async function createDentist(page: Page, d: typeof ANA) {
  await page.getByRole("button", { name: "New dentist" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name").fill(d.name);
  await dialog.getByLabel("Email").fill(d.email);
  await dialog.getByLabel("Temporary password").fill(d.password);
  await dialog.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("cell", { name: new RegExp(d.email) })).toBeVisible();
}

async function addWorkplace(page: Page, name: string, partner: boolean) {
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Clinic name").fill(name);
  if (partner) await dialog.getByText("Partner clinic", { exact: true }).click();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
}

test("a dentist's day, end to end, and another dentist can't see it", async ({ page }) => {
  let patientUrl = "";
  let fileUrl = "";

  await test.step("admin creates two dentist accounts", async () => {
    await signIn(page, ADMIN);
    await page.goto("/admin/users");
    await createDentist(page, ANA);
    await createDentist(page, OTHER);
    await signOut(page);
  });

  await test.step("dentist sets up a partner clinic (40%) and her own clinic", async () => {
    await signIn(page, ANA);
    await page.goto("/settings");
    await addWorkplace(page, "Partner Dental", true);
    await addWorkplace(page, "Home Clinic", false);
    await expect(page.getByText("Partner clinic · 40% share")).toBeVisible();
  });

  await test.step("adds a patient with consent", async () => {
    await page.goto("/patients/new");
    await page.getByLabel("First name").fill("Juan");
    await page.getByLabel("Last name").fill("Dela Cruz");
    await page.getByLabel("Mobile").fill("0917 555 0199");
    await page.getByLabel("Allergies").fill("Penicillin");
    await page.locator("label", { hasText: "Patient agreed to the privacy notice" }).getByRole("checkbox").click();
    await page.getByRole("button", { name: "Add patient" }).click();
    await expect(page).toHaveURL(/\/patients\/[0-9a-f-]{36}$/);
    patientUrl = new URL(page.url()).pathname;
    await expect(page.getByText("Medical alert:")).toBeVisible();
    await expect(page.getByText("P-0001", { exact: true })).toBeVisible();
  });

  await test.step("finds the patient with Ctrl+K by partial name", async () => {
    await page.goto("/");
    await page.keyboard.press("Control+k");
    await page.getByPlaceholder("Search by name, phone or patient code").fill("dela cr");
    await expect(page.getByRole("option", { name: /Juan Dela Cruz/ })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(patientUrl);
  });

  await test.step("charts caries on tooth 16", async () => {
    await page.goto(`${patientUrl}/chart`);
    await page.getByRole("button", { name: "Tooth 16, no findings" }).click();
    await page.getByRole("checkbox", { name: "Occlusal / incisal" }).check({ force: true });
    await page.getByRole("button", { name: "Save to chart" }).click();
    await expect(page.getByRole("button", { name: /Tooth 16, Caries O/ })).toBeVisible();
  });

  await test.step("uploads an X-ray", async () => {
    await page.goto(`${patientUrl}/files`);
    await page.getByRole("button", { name: "Upload" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("#upload-file").setInputFiles({ name: "xray.png", mimeType: "image/png", buffer: PNG });
    await dialog.getByLabel("Note").fill("Periapical 16");
    await dialog.getByRole("button", { name: "Upload" }).click();
    const img = page.getByRole("img", { name: "Periapical 16" });
    await expect(img).toBeVisible();
    fileUrl = (await img.getAttribute("src")) ?? "";
    expect(fileUrl).toMatch(/^\/api\/files\/[0-9a-f-]{36}$/);
  });

  await test.step("books an appointment at the partner clinic", async () => {
    await page.goto(`${patientUrl}/appointments`);
    await page.getByRole("button", { name: "Book" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Time").fill("15:30");
    await dialog.getByLabel("Reason").fill("Crown prep");
    await dialog.getByRole("button", { name: "Book" }).click();
    await expect(page.getByText("Crown prep")).toBeVisible();
  });

  await test.step("records a crown with a lab fee, then a partial payment and prints the receipt", async () => {
    await page.goto(`${patientUrl}/treatments`);
    await page.getByRole("button", { name: "Add treatment" }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("Procedure").fill("Crown");
    await dialog.getByLabel("Teeth").fill("16");
    await dialog.getByLabel("Fee (₱)", { exact: true }).fill("10,000");
    await dialog.getByLabel("Lab fee (₱)").fill("2000");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("₱10,000.00").first()).toBeVisible();

    await page.goto(`${patientUrl}/billing`);
    await page.getByRole("button", { name: "Add payment" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Amount (₱)").fill("4000");
    await dialog.getByRole("button", { name: "Record payment" }).click();
    await expect(page.getByText("AR-00001")).toBeVisible();
    await expect(page.getByText("Collected by clinic")).toBeVisible();

    await page.getByRole("link", { name: "Print receipt AR-00001" }).click();
    await expect(page.getByText("Four Thousand Pesos Only")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Partner Dental" })).toBeVisible();
  });

  await test.step("earnings show the commission split", async () => {
    await page.goto("/earnings");
    // (₱4,000 collected − ₱2,000 lab fee) × 40% = ₱800
    await expect(page.getByText("Your 40% share")).toBeVisible();
    await expect(page.getByText("Clinic still owes you")).toBeVisible();
    await expect(page.getByText("₱800.00").first()).toBeVisible();
  });

  await test.step("using stock below the reorder level flags it as low", async () => {
    await page.goto("/inventory");
    await page.getByRole("button", { name: "Add item" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name", { exact: true }).fill("Gloves (M)");
    await dialog.getByLabel("Unit", { exact: true }).fill("box");
    await dialog.getByLabel("Reorder at").fill("2");
    await dialog.getByLabel("Opening stock").fill("3");
    await dialog.getByRole("button", { name: "Save" }).click();
    await page.getByRole("button", { name: "Record use: Gloves (M)" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Use" }).click();
    await expect(page.getByText("Low", { exact: true })).toBeVisible();
    await signOut(page);
  });

  await test.step("another dentist sees none of it", async () => {
    await signIn(page, OTHER);
    await page.goto("/patients");
    await expect(page.getByText("No patients yet")).toBeVisible();
    await page.keyboard.press("Control+k");
    await page.getByPlaceholder("Search by name, phone or patient code").fill("dela");
    await expect(page.getByText("No patients match")).toBeVisible();
    await page.keyboard.press("Escape");

    // The page streams behind loading.tsx, so the status is already 200 when
    // notFound() runs; check what renders instead.
    await page.goto(patientUrl);
    await expect(page.getByText("This page could not be found.")).toBeVisible();
    await expect(page.getByText("Dela Cruz")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"][content="noindex"]').first()).toBeAttached();
    const file = await page.request.get(fileUrl);
    expect(file.status()).toBe(404);
  });
});
