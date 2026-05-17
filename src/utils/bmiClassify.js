// ── WHO/DOH BMI-for-age classification utility ────────────────────────────────
// Shared between NutritionEntry (form) and Dashboard (analytics)
// Source: WHO Child Growth Standards (0-5 yrs) & WHO Reference 2007 (5-19 yrs)

const CHILD_BMI_TABLE = [
  [0,10.1,11.1,16.5,18.0],[1,12.0,13.2,17.6,19.4],[2,12.5,13.7,17.5,19.1],
  [3,12.5,13.5,17.0,18.6],[4,12.5,13.4,16.9,18.5],[5,12.1,13.1,17.1,19.2],
  [6,12.0,13.0,17.5,19.8],[7,12.0,13.1,18.0,20.6],[8,12.1,13.3,18.6,21.6],
  [9,12.4,13.7,19.3,22.8],[10,12.7,14.1,20.0,23.9],[11,13.1,14.7,20.9,25.1],
  [12,13.6,15.2,21.7,26.0],[13,14.1,15.8,22.5,26.8],[14,14.6,16.4,23.3,27.6],
  [15,15.0,16.9,24.0,28.2],[16,15.4,17.3,24.7,28.9],[17,15.7,17.8,25.3,29.4],
  [18,16.0,18.2,25.9,30.0],[19,16.3,18.5,26.0,30.0],
]

const HEIGHT_MEDIAN = [
  [0,50],[1,75],[2,87],[3,96],[4,103],[5,110],[6,116],[7,122],[8,128],[9,133],
  [10,138],[11,143],[12,149],[13,156],[14,163],[15,168],[16,171],[17,172],[18,172],[19,173],
]

export function calcAge(birthDate) {
  if (!birthDate) return null
  const d = new Date(birthDate)
  if (isNaN(d)) return null
  const age = Math.floor((Date.now() - d.getTime()) / (1000*60*60*24*365.25))
  return age >= 0 ? age : null
}

export function calcBMI(weight, height) {
  const w = parseFloat(weight), h = parseFloat(height)
  if (!w || !h || h <= 0) return null
  return parseFloat((w / ((h/100)**2)).toFixed(1))
}

function getChildCutoffs(age) {
  const a = Math.max(0, Math.min(19, Math.round(age)))
  return CHILD_BMI_TABLE.find(r => r[0] === a) || CHILD_BMI_TABLE[19]
}
function getHeightMedian(age) {
  const a = Math.max(0, Math.min(19, Math.round(age)))
  return (HEIGHT_MEDIAN.find(r => r[0] === a) || [19,173])[1]
}

export function getBMIClassification(bmi, birthDate, height) {
  const b = parseFloat(bmi)
  if (isNaN(b) || b <= 0) return { label:'—', color:'slate', note:'' }
  const age = calcAge(birthDate)

  if (age === null || age >= 20) {
    if (b < 16.0) return { label:'Severely Underweight', color:'red',    note:'Adult WHO BMI <16.0' }
    if (b < 18.5) return { label:'Underweight',          color:'amber',  note:'Adult WHO BMI <18.5' }
    if (b < 25.0) return { label:'Normal',               color:'emerald',note:'Adult WHO BMI 18.5–24.9' }
    if (b < 30.0) return { label:'Overweight',           color:'orange', note:'Adult WHO BMI 25.0–29.9' }
    return               { label:'Obese',                color:'red',    note:'Adult WHO BMI ≥30.0' }
  }

  const [,sevUW,uw,ow,ob] = getChildCutoffs(age)
  const note = `Age ${age} yrs · WHO BMI-for-age`
  let label, color

  if      (b < sevUW) { label='Severely Underweight'; color='red'     }
  else if (b < uw)    { label='Underweight';          color='amber'   }
  else if (b < ow)    { label='Normal';               color='emerald' }
  else if (b < ob)    { label='Overweight';           color='orange'  }
  else                { label='Obese';                color='red'      }

  const h = parseFloat(height)
  if (h > 0 && age >= 0 && age <= 19) {
    const median = getHeightMedian(age)
    if (h < median * 0.90) {
      if (label === 'Underweight' || label === 'Severely Underweight')
        return { label:'Wasted',  color:'red',    note:`${note} · Low weight & height-for-age` }
      if (label === 'Normal')
        return { label:'Stunted', color:'purple', note:`${note} · Height <90% of WHO median` }
    }
  }
  return { label, color, note }
}

export const ALERT_STATUSES = new Set([
  'Underweight','Severely Underweight','Stunted','Wasted','Severe Wasting (SAM)','Moderate Wasting',
])
