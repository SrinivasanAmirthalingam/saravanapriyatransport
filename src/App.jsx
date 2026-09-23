import { useMemo, useState } from 'react'
import invoiceTemplate from './bill-template/invoice-template.html?raw'
import './App.css'

const formatDateForDisplay = (date) => {
  const value = date instanceof Date ? date : new Date()
  const day = String(value.getDate()).padStart(2, '0')
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const year = value.getFullYear()
  return `${day}/${month}/${year}`
}

const getTodayDateValue = () => formatDateForDisplay(new Date())

const numberToWords = (amount) => {
  const ones = [
    'ZERO',
    'ONE',
    'TWO',
    'THREE',
    'FOUR',
    'FIVE',
    'SIX',
    'SEVEN',
    'EIGHT',
    'NINE',
  ]
  const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN']
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']

  const convertBelowHundred = (value) => {
    if (value < 10) return ones[value]
    if (value < 20) return teens[value - 10]
    const ten = Math.floor(value / 10)
    const rem = value % 10
    return rem === 0 ? tens[ten] : `${tens[ten]} ${ones[rem]}`
  }

  const convertBelowThousand = (value) => {
    if (value < 100) return convertBelowHundred(value)
    const hundred = Math.floor(value / 100)
    const rem = value % 100
    return rem === 0 ? `${ones[hundred]} HUNDRED` : `${ones[hundred]} HUNDRED ${convertBelowHundred(rem)}`
  }

  const convert = (value) => {
    if (value === 0) return 'ZERO'
    if (value < 1000) return convertBelowThousand(value)
    if (value < 100000) {
      const thousand = Math.floor(value / 1000)
      const rem = value % 1000
      return rem === 0 ? `${convertBelowThousand(thousand)} THOUSAND` : `${convertBelowThousand(thousand)} THOUSAND ${convertBelowThousand(rem)}`
    }
    if (value < 10000000) {
      const lakh = Math.floor(value / 100000)
      const rem = value % 100000
      return rem === 0 ? `${convertBelowThousand(lakh)} LAKH` : `${convertBelowThousand(lakh)} LAKH ${convertBelowThousand(rem)}`
    }
    const crore = Math.floor(value / 10000000)
    const rem = value % 10000000
    return rem === 0 ? `${convertBelowThousand(crore)} CRORE` : `${convertBelowThousand(crore)} CRORE ${convertBelowThousand(rem)}`
  }

  const rupees = Math.floor(Number(amount) || 0)
  return convert(rupees).toUpperCase()
}

const createTripRow = () => ({
  id: Date.now() + Math.random(),
  tripDate: '',
  description: '',
  tripQuantity: '',
  costPerTrip: '',
  amount: 0,
})

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const formatAmount = (value) => {
  const numericValue = Math.round(Number(value) || 0)
  return `${numericValue}/-`
}

function App() {
  const getIsoDate = (dateValue) => {
    if (!dateValue) return ''

    const [day, month, year] = String(dateValue).split('/')
    if (day && month && year) {
      return `${year}-${month}-${day}`
    }

    const parsed = new Date(dateValue)
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10)
  }

  const [billDetails, setBillDetails] = useState({
    invoiceDate: getTodayDateValue(),
    invoiceNo: '',
    invoiceTo: '',
    invoiceAddress: '',
  })

  const [tripRows, setTripRows] = useState([createTripRow()])
  const [screen, setScreen] = useState('form')
  const [formErrors, setFormErrors] = useState({})

  const totalAmount = useMemo(
    () =>
      tripRows.reduce((sum, row) => {
        const quantity = Number(row.tripQuantity) || 0
        const cost = Number(row.costPerTrip) || 0
        return sum + quantity * cost
      }, 0),
    [tripRows],
  )

  const handleBillChange = (event) => {
    const { name, value } = event.target

    if (name === 'invoiceDate') {
      const [year, month, day] = value.split('-')
      const formatted = year && month && day ? `${day}/${month}/${year}` : value
      setBillDetails((prev) => ({ ...prev, [name]: formatted }))
      return
    }

    setBillDetails((prev) => ({ ...prev, [name]: value }))
  }

  const handleTripRowChange = (id, field, value) => {
    setTripRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) {
          return row
        }

        const updatedRow = { ...row, [field]: value }

        if (field === 'tripDate') {
          const [year, month, day] = value.split('-')
          updatedRow.tripDate = year && month && day ? `${day}/${month}/${year}` : value
        }

        if (field === 'tripQuantity' || field === 'costPerTrip') {
          const quantity = Number(updatedRow.tripQuantity) || 0
          const cost = Number(updatedRow.costPerTrip) || 0
          updatedRow.amount = Math.round(quantity * cost)
        }

        return updatedRow
      }),
    )
  }

  const addTripRow = () => {
    setTripRows((prev) => [...prev, createTripRow()])
  }

  const removeTripRow = (id) => {
    setTripRows((prev) => {
      if (prev.length === 1) {
        return [createTripRow()]
      }
      return prev.filter((row) => row.id !== id)
    })
  }

  const buildBillHtml = () => {
    const rowsHtml = tripRows
      .filter((row) => row.description || row.tripDate || row.tripQuantity || row.costPerTrip)
      .map((row, index) => {
        const quantity = Number(row.tripQuantity) || 0
        const cost = Number(row.costPerTrip) || 0
        const amount = quantity * cost

        return `
          <tr style="height:16mm;vertical-align:top;">
            <td style="border:1px solid #333;padding:4px 5px;text-align:center;vertical-align:top;">${index + 1}.</td>
            <td style="border:1px solid #333;padding:4px 5px;white-space:nowrap;vertical-align:top;">${escapeHtml(row.tripDate || '')}</td>
            <td style="border:1px solid #333;padding:3px 4px;line-height:1.3;white-space:pre-wrap;vertical-align:top;word-break:break-word;">${escapeHtml(row.description || '')}</td>
            <td style="border:1px solid #333;padding:4px 3px;text-align:center;vertical-align:top;">${escapeHtml(row.tripQuantity || '0')}</td>
            <td style="border:1px solid #333;padding:4px 3px;text-align:right;vertical-align:top;white-space:nowrap;">${escapeHtml(formatAmount(cost))}</td>
            <td style="border:1px solid #333;padding:4px 3px;text-align:right;vertical-align:top;white-space:nowrap;">${escapeHtml(formatAmount(amount))}</td>
          </tr>
        `
      })
      .join('')

    const replacements = {
      InvoiceNo: escapeHtml(billDetails.invoiceNo || 'INV-001'),
      InvoiceDate: escapeHtml(billDetails.invoiceDate || formatDateForDisplay(new Date())),
      InvoiceTo: escapeHtml(billDetails.invoiceTo || 'Customer Name'),
      InvoiceAddress: escapeHtml(billDetails.invoiceAddress || 'Chennai'),
      TotalAmount: escapeHtml(formatAmount(totalAmount)),
      AmountInWords: escapeHtml(numberToWords(totalAmount)),
    }

    const templateBody = invoiceTemplate.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? invoiceTemplate

    let html = templateBody
    Object.entries(replacements).forEach(([key, value]) => {
      html = html.replaceAll(`{{${key}}}`, value)
    })

    html = html.replace(/{{BillRows}}/g, rowsHtml || '<tr><td colspan="6" style="border:1px solid #333;padding:8px;text-align:center;">No trip data</td></tr>')
    html = html.replace(/{{AmountInWords}}/g, escapeHtml(numberToWords(totalAmount)))

    return html
  }

  const validateForm = () => {
    const errors = {}

    if (!billDetails.invoiceDate) {
      errors.invoiceDate = 'Invoice date is required.'
    }

    if (!billDetails.invoiceTo?.trim()) {
      errors.invoiceTo = 'Invoice to is required.'
    }

    if (!billDetails.invoiceAddress?.trim()) {
      errors.invoiceAddress = 'Address is required.'
    }

    tripRows.forEach((row, index) => {
      if (!row.tripDate) {
        errors[`tripDate-${row.id}`] = `Trip date is required for row ${index + 1}.`
      }

      if (!row.description?.trim()) {
        errors[`description-${row.id}`] = `Description is required for row ${index + 1}.`
      }

      if (!row.tripQuantity || Number(row.tripQuantity) <= 0) {
        errors[`tripQuantity-${row.id}`] = `Quantity must be greater than 0 for row ${index + 1}.`
      }

      if (!row.costPerTrip || Number(row.costPerTrip) <= 0) {
        errors[`costPerTrip-${row.id}`] = `Cost per trip must be greater than 0 for row ${index + 1}.`
      }
    })

    return errors
  }

  const handleGenerateBill = () => {
    const errors = validateForm()
    setFormErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    setScreen('bill')
  }

  const handleBack = () => {
    setScreen('form')
  }

  const resetForm = () => {
    setBillDetails({
      invoiceDate: getTodayDateValue(),
      invoiceNo: '',
      invoiceTo: '',
      invoiceAddress: '',
    })
    setTripRows([createTripRow()])
  }

  const printBill = () => {
    window.print()
  }

  if (screen === 'bill') {
    return (
      <div className="bill-screen">
        <div className="bill-toolbar">
          <button type="button" className="secondary-btn" onClick={handleBack}>
            Back
          </button>
          <button type="button" className="primary-btn" onClick={printBill}>
            Print Bill
          </button>
        </div>
        <div className="bill-preview" dangerouslySetInnerHTML={{ __html: buildBillHtml() }} />
      </div>
    )
  }

  return (
    <div className="billing-app">
      <div className="billing-card">
        <header className="header-section header-centered">
          <div className="header-title-wrap">
            <p className="eyebrow">Transport Billing</p>
            <h1>Bill Details</h1>
          </div>
        </header>

        <section className="invoice-meta">
          <div className="field-group">
            <label htmlFor="invoiceDate">Invoice Date</label>
            <input
              id="invoiceDate"
              name="invoiceDate"
              type="date"
              value={getIsoDate(billDetails.invoiceDate)}
              onChange={handleBillChange}
              className={formErrors.invoiceDate ? 'input-error' : ''}
              aria-invalid={Boolean(formErrors.invoiceDate)}
            />
            {formErrors.invoiceDate ? <span className="error-text">{formErrors.invoiceDate}</span> : null}
          </div>

          <div className="field-group">
            <label htmlFor="invoiceNo">Invoice No:</label>
            <input
              id="invoiceNo"
              name="invoiceNo"
              type="text"
              placeholder="INV-001"
              value={billDetails.invoiceNo}
              onChange={handleBillChange}
              className={formErrors.invoiceNo ? 'input-error' : ''}
              aria-invalid={Boolean(formErrors.invoiceNo)}
            />
            {formErrors.invoiceNo ? <span className="error-text">{formErrors.invoiceNo}</span> : null}
          </div>

          <div className="field-group invoice-to-address-row">
            <div className="inline-field">
              <label htmlFor="invoiceTo">Invoice To:</label>
              <input
                id="invoiceTo"
                name="invoiceTo"
                type="text"
                placeholder="Customer name"
                value={billDetails.invoiceTo}
                onChange={handleBillChange}
                className={formErrors.invoiceTo ? 'input-error' : ''}
                aria-invalid={Boolean(formErrors.invoiceTo)}
              />
              {formErrors.invoiceTo ? <span className="error-text">{formErrors.invoiceTo}</span> : null}
            </div>

            <div className="inline-field">
              <label htmlFor="invoiceAddress">Address:</label>
              <textarea
                id="invoiceAddress"
                name="invoiceAddress"
                rows="3"
                placeholder="Customer address"
                value={billDetails.invoiceAddress}
                onChange={handleBillChange}
                className={formErrors.invoiceAddress ? 'input-error' : ''}
                aria-invalid={Boolean(formErrors.invoiceAddress)}
              />
              {formErrors.invoiceAddress ? <span className="error-text">{formErrors.invoiceAddress}</span> : null}
            </div>
          </div>
        </section>

        <section className="trip-section">
          <div className="section-head">
            <h2>Trip Details</h2>
            <button type="button" className="secondary-btn" onClick={addTripRow}>
              + Add Row
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Trip Date</th>
                  <th>Description</th>
                  <th>Trip Quantity</th>
                  <th>Cost per trip</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {tripRows.map((row, index) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        type="date"
                        value={getIsoDate(row.tripDate)}
                        onChange={(event) => handleTripRowChange(row.id, 'tripDate', event.target.value)}
                        className={formErrors[`tripDate-${row.id}`] ? 'input-error' : ''}
                        aria-invalid={Boolean(formErrors[`tripDate-${row.id}`])}
                      />
                      {formErrors[`tripDate-${row.id}`] ? <div className="error-text">{formErrors[`tripDate-${row.id}`]}</div> : null}
                    </td>
                    <td>
                      <textarea
                        rows="2"
                        placeholder={`Trip ${index + 1}`}
                        value={row.description}
                        onChange={(event) => handleTripRowChange(row.id, 'description', event.target.value)}
                        className={formErrors[`description-${row.id}`] ? 'input-error' : ''}
                        aria-invalid={Boolean(formErrors[`description-${row.id}`])}
                      />
                      {formErrors[`description-${row.id}`] ? <div className="error-text">{formErrors[`description-${row.id}`]}</div> : null}
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={row.tripQuantity}
                        onChange={(event) => handleTripRowChange(row.id, 'tripQuantity', event.target.value)}
                        className={formErrors[`tripQuantity-${row.id}`] ? 'input-error' : ''}
                        aria-invalid={Boolean(formErrors[`tripQuantity-${row.id}`])}
                      />
                      {formErrors[`tripQuantity-${row.id}`] ? <div className="error-text">{formErrors[`tripQuantity-${row.id}`]}</div> : null}
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={row.costPerTrip}
                        onChange={(event) => handleTripRowChange(row.id, 'costPerTrip', event.target.value)}
                        className={formErrors[`costPerTrip-${row.id}`] ? 'input-error' : ''}
                        aria-invalid={Boolean(formErrors[`costPerTrip-${row.id}`])}
                      />
                      {formErrors[`costPerTrip-${row.id}`] ? <div className="error-text">{formErrors[`costPerTrip-${row.id}`]}</div> : null}
                    </td>
                    <td>
                      <input
                        type="number"
                        readOnly
                        value={row.amount || 0}
                        aria-label={`Amount for trip ${index + 1}`}
                      />
                    </td>
                    <td>
                      <button type="button" className="delete-btn" onClick={() => removeTripRow(row.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="summary-bar">
          <div>
            <span>Total Amount</span>
            <strong>₹{formatAmount(totalAmount)}</strong>
          </div>
        </footer>

        <div className="form-actions">
          <button type="button" className="secondary-btn" onClick={resetForm}>
            Reset
          </button>
          <button type="button" className="primary-btn" onClick={handleGenerateBill}>
            Generate Bill
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
