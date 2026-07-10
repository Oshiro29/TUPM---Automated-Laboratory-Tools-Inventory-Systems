const students = [
  {
    id: 'TUPM-23-1111',
    name: 'Maria Santos',
    pin: '4321',
    email: 'maria.santos@tupm.edu.ph',
  },
  {
    id: 'TUPM-23-1112',
    name: 'Jerome Cruz',
    pin: '1234',
    email: 'jerome.cruz@tupm.edu.ph',
  },
];

const tools = [
  {
    id: 'tool-1',
    name: 'Multimeter',
    description: 'High-precision digital unit for voltage, current, and resistance.',
    slot: 'C-03',
    totalQty: 5,
    availableQty: 3,
  },
  {
    id: 'tool-2',
    name: 'Soldering Iron',
    description: 'Temperature-controlled station for soldering.',
    slot: 'C-05',
    totalQty: 4,
    availableQty: 2,
  },
  {
    id: 'tool-3',
    name: 'Oscilloscope',
    description: 'Two-channel digital storage oscilloscope.',
    slot: 'C-07',
    totalQty: 2,
    availableQty: 1,
  },
  {
    id: 'tool-4',
    name: 'Tool Kit',
    description: 'Screwdrivers, pliers, and wire strippers set.',
    slot: 'C-09',
    totalQty: 8,
    availableQty: 6,
  },
];

const transactions = [];

const alerts = [];

module.exports = {
  students,
  tools,
  transactions,
  alerts,
};
