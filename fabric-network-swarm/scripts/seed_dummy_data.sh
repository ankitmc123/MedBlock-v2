#!/bin/bash
# seed_dummy_data.sh
# Automatically populates the blockchain and IPFS with realistic mock data for testing!

echo "============================================================"
echo "    Seeding Pharmacy MedBlock with Dummy Data..."
echo "============================================================"

API_URL="http://127.0.0.1:3000/api"

echo -e "\n[1/3] Registering Employees (Doctors / Billing / Inventory)..."
curl -s -X POST "$API_URL/register-user" -H "Content-Type: application/json" -d '{"user": "manager", "userId": "doc101_smith", "role": "billing"}' > /dev/null
curl -s -X POST "$API_URL/register-user" -H "Content-Type: application/json" -d '{"user": "manager", "userId": "doc102_jones", "role": "billing"}' > /dev/null
curl -s -X POST "$API_URL/register-user" -H "Content-Type: application/json" -d '{"user": "manager", "userId": "inv_manager", "role": "inventory"}' > /dev/null
echo "✓ Doctors and Staff populated in the wallet and ledger."

echo -e "\n[2/3] Stocking Pharmacy Inventory..."
curl -s -X POST "$API_URL/inventory" -H "Content-Type: application/json" -d '{"user": "inv_manager", "medicineId": "med_para_500", "name": "Paracetamol 500mg", "quantity": 1000, "price": 5.50}' > /dev/null
curl -s -X POST "$API_URL/inventory" -H "Content-Type: application/json" -d '{"user": "inv_manager", "medicineId": "med_amox_250", "name": "Amoxicillin 250mg", "quantity": 300, "price": 12.00}' > /dev/null
curl -s -X POST "$API_URL/inventory" -H "Content-Type: application/json" -d '{"user": "inv_manager", "medicineId": "med_ibup_400", "name": "Ibuprofen 400mg", "quantity": 500, "price": 8.25}' > /dev/null
echo "✓ Medicines added to inventory."

echo -e "\n[3/3] Issuing Dummy Prescriptions for Patients..."

# Prescription for Patient 1 (Alice)
curl -s -X POST "$API_URL/prescription" -H "Content-Type: application/json" -d '{
  "user": "doc101_smith",
  "patientId": "pat001",
  "name": "Alice Wonderland",
  "medicines": [{"name": "Paracetamol 500mg", "dosage": "2x daily"}],
  "extraData": {"diagnosis": "Viral Fever", "notes": "Rest for 3 days"}
}' > /dev/null

# Prescription for Patient 2 (Bob)
curl -s -X POST "$API_URL/prescription" -H "Content-Type: application/json" -d '{
  "user": "doc102_jones",
  "patientId": "pat002",
  "name": "Bob Builder",
  "medicines": [{"name": "Amoxicillin 250mg", "dosage": "1x daily for 7 days"}],
  "extraData": {"diagnosis": "Bacterial Infection", "notes": "Finish entire course"}
}' > /dev/null

echo "✓ Prescriptions successfully stored on IPFS and Blockchain."

echo -e "\n============================================================"
echo "    Done! Your dashboards are now full of rich dummy data!"
echo "============================================================"
echo "Try logging into the Patient Portal as 'pat001' or 'pat002'!"
