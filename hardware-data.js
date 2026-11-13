/* Educational metadata for the 3D hardware components (ids match the scene groups in gl/scene-computer.js). */
(function(global){
  'use strict';
  const HARDWARE_COMPONENTS = {
    motherboard: {
      id: 'motherboard',
      name: '8-Layer High-Tg FR-4 Motherboard PCB',
      category: 'MAIN INTERCONNECT SUBSTRATE',
      purpose: 'Provides the physical mechanical mounting, multi-phase regulated power planes, and impedance-controlled copper signal traces linking the CPU, RAM, NVMe SSD, VRM, PCIe slot, and Embedded Controller.',
      internalWorking: 'Alternates copper signal layers with ground/power reference planes separated by fiberglass-epoxy (FR-4) prepreg. Plated through-hole and blind micro-vias route signals vertically between layers.',
      diagramAscii: 'Layer 1 (Top Signal/Microstrip) -> Layer 2 (GND Plane) -> Layer 3/4 (Inner Differential Stripline Buses) -> Layer 5 (VDD Power Plane) -> Layer 6 (Bottom Signal)',
      connections: ['CPU Package Socket', 'DDR5 DIMM Slots', 'M.2 NVMe Connector', '8-Phase VRM', 'PCIe ×16 Expansion Slot'],
      relatedModule: 'mod4',
      relatedModuleTitle: 'Module 4 — Memory Organization & Buses',
      relatedExperiment: 'exp6',
      relatedExperimentTitle: 'Experiment 6 — Address Decoding & Bus Routing'
    },
    cpu_package: {
      id: 'cpu_package',
      name: 'CPU Flip-Chip LGA Package & Integrated Heat Spreader (IHS)',
      category: 'PROCESSOR PACKAGE',
      purpose: 'Houses and protects the delicate CMOS silicon die, routes thousands of microscopic die bumps out to gold land-grid pads that touch the spring pins of the socket, and transfers thermal energy through a nickel-plated copper lid.',
      internalWorking: 'Controlled Collapse Chip Connection (C4) micro-bumps bond the silicon die face-down onto a multi-layer organic substrate. Surface-mount MLCC decoupling capacitors suppress high-frequency di/dt voltage droop.',
      diagramAscii: '[Copper/Nickel IHS Lid] <--TIM--> [CMOS Silicon Die] <--C4 Micro-Bumps--> [Organic Substrate] <--LGA Lands--> [Motherboard]',
      connections: ['CPU Silicon Die', 'Motherboard Socket', 'VRM Power Rail', 'Copper Heat Pipes'],
      relatedModule: 'mod5',
      relatedModuleTitle: 'Module 5 — Computer Organization & RISC-V',
      relatedExperiment: 'exp7',
      relatedExperimentTitle: 'Experiment 7 — RISC-V Processor Execution'
    },
    cpu_die: {
      id: 'cpu_die',
      name: 'CPU Silicon Die (Educational Microarchitecture Floorplan)',
      category: 'CMOS INTEGRATED CIRCUIT',
      purpose: 'Executes stored-program instructions using interconnected combinational (ALU, Multiplexers, Decoders) and sequential (PC, Register File, Pipeline Registers, SRAM Cache) sub-blocks.',
      internalWorking: 'FinFET CMOS transistors switch on clock edges to fetch 32-bit instructions, read dual-port registers, compute arithmetic/logic results in the ALU, and access L1/L2/L3 SRAM caches. (Note: Educational floorplan representation, not a proprietary commercial die photomicrograph.)',
      diagramAscii: '+-------------------+-------------------+\n| CONTROL UNIT PLA  | 32-BIT ALU ARRAY  |\n+-------------------+-------------------+\n| 32x32 REG FILE    | L1 / L2 SRAM CACHE|\n+-------------------+-------------------+',
      connections: ['Control Unit', 'ALU', 'Register File', 'L1/L2/L3 Cache', 'DDR5 Memory Controller'],
      relatedModule: 'mod5',
      relatedModuleTitle: 'Module 5 — RISC-V Processor Architecture',
      relatedExperiment: 'exp4',
      relatedExperimentTitle: 'Experiment 4 — Arithmetic Logic Unit (ALU)'
    },
    ram: {
      id: 'ram',
      name: 'Dual-Channel DDR5 UDIMM Modules (288-Pin)',
      category: 'VOLATILE MAIN MEMORY (DRAM)',
      purpose: 'Stores active program instructions, runtime stack frames, and application heaps with nanosecond-scale random access.',
      internalWorking: 'Each bit is stored as electric charge in a 1-Transistor 1-Capacitor (1T1C) cell arranged in 2D rows and columns. Row address decoders activate wordlines, and sense amplifiers read and refresh capacitor charge every 64 ms.',
      diagramAscii: 'Address Bus -> [Row/Col Decoder] -> [1T1C DRAM Bank Array] <-> [Sense Amplifiers] <-> 64-Bit Data Bus',
      connections: ['CPU Integrated Memory Controller', 'On-DIMM PMIC', 'Motherboard DDR5 Trace Bus'],
      relatedModule: 'mod4',
      relatedModuleTitle: 'Module 4 — Memory Organization (SRAM vs. DRAM)',
      relatedExperiment: 'exp6',
      relatedExperimentTitle: 'Experiment 6 — RAM/ROM Read & Write Operations'
    },
    ssd: {
      id: 'ssd',
      name: 'M.2 2280 NVMe PCIe Gen5 Solid-State Drive',
      category: 'NON-VOLATILE SECONDARY STORAGE',
      purpose: 'Retains operating system kernels, binaries, and user files persistently when power is removed.',
      internalWorking: 'An embedded multi-core controller IC communicates over 4 differential PCIe lanes and manages wear-leveling, ECC, and Flash Translation Layer (FTL) mapping across 3D TLC NAND charge-trap flash dies.',
      diagramAscii: 'PCIe x4 Host Bus <-> [NVMe Controller + DRAM Map] <-> [8-Channel Flash Bus] <-> [3D NAND Flash Dies]',
      connections: ['PCIe Root Complex', 'DRAM Buffer', 'Motherboard M.2 M-Key Slot'],
      relatedModule: 'mod4',
      relatedModuleTitle: 'Module 4 — Memory Hierarchy',
      relatedExperiment: 'exp6',
      relatedExperimentTitle: 'Experiment 6 — Memory Hierarchy & Addressing'
    },
    vrm: {
      id: 'vrm',
      name: '8-Phase Buck VRM (Alloy Inductors, DrMOS & Polymer Capacitors)',
      category: 'POWER DELIVERY & FILTERING',
      purpose: 'Steps down the 11.5V–20V battery/adapter rail to a tightly regulated 0.85V–1.25V high-current core voltage (VCore) for the CPU and GPU.',
      internalWorking: 'High-side and low-side MOSFETs switch at hundreds of kilohertz into shielded alloy inductors (L) and low-ESR solid polymer capacitors (C) to deliver smooth DC voltage under rapid processor load transients.',
      diagramAscii: 'Vin (12V-20V) -> [PWM Controller] -> [DrMOS High/Low FETs] -> [Shielded Inductor L] -> [Polymer Cap C] -> VCore (1.0V)',
      connections: ['Battery Pack', 'CPU Power Planes', 'Embedded Controller Telemetry'],
      relatedModule: 'mod1',
      relatedModuleTitle: 'Module 1 — Stable Digital Voltage Rails (VDD/GND)',
      relatedExperiment: 'exp1',
      relatedExperimentTitle: 'Experiment 1 — Digital Logic Voltage Thresholds'
    },
    cooling: {
      id: 'cooling',
      name: 'Sintered Copper Heat Pipes, Skived Fin Stacks & Radial Blowers',
      category: 'THERMAL DISSIPATION SYSTEM',
      purpose: 'Transfers Joule heat (P = C · V^2 · f) away from the CPU and GPU silicon dies to prevent thermal throttling.',
      internalWorking: 'Working fluid inside sealed copper heat pipes evaporates over the hot CPU coldplate, travels as vapor to the exhaust radiator fins, condenses back to liquid, and returns via capillary wick action while 17-blade centrifugal blowers exhaust warm air.',
      diagramAscii: '[CPU Die Heat] -> [Coldplate Evaporator] ==(Vapor)==> [Copper Fin Condenser + Fan Airflow] ==(Wick Liquid)==> [Coldplate]',
      connections: ['CPU IHS', 'GPU Die', 'EC Fan PWM Controller'],
      relatedModule: 'mod6',
      relatedModuleTitle: 'Module 6 — Clock Frequency, Power & Performance',
      relatedExperiment: 'exp8',
      relatedExperimentTitle: 'Experiment 8 — Peripheral PWM & Thermal Control'
    },
    pcie_connectors: {
      id: 'pcie_connectors',
      name: 'PCIe Expansion Slot, I/O Ports & Embedded Controller (EC)',
      category: 'I/O & PERIPHERAL INTERCONNECT',
      purpose: 'Connects external peripherals, high-speed expansion cards, and the internal keyboard matrix to the host processor via memory-mapped I/O and interrupt lines.',
      internalWorking: 'The Embedded Controller (QFP-128) scans the keyboard row/column matrix, debounces switch closures, and sends scan codes over eSPI, while PCIe and USB-C controllers route high-speed differential packets.',
      diagramAscii: '[Keyboard Matrix / USB-C / PCIe Slot] -> [EC / I-O Controller] --(IRQ + MMIO Address Bus)--> [CPU Core]',
      connections: ['Keyboard Matrix', 'Motherboard Bus', 'CPU Interrupt Controller'],
      relatedModule: 'mod6',
      relatedModuleTitle: 'Module 6 — Memory-Mapped I/O & Peripherals',
      relatedExperiment: 'exp8',
      relatedExperimentTitle: 'Experiment 8 — Memory-Mapped I/O & Peripheral Interfacing'
    }
  };
  global.ITM_HARDWARE_DATA = HARDWARE_COMPONENTS;
  if (typeof module !== 'undefined' && module.exports) module.exports = HARDWARE_COMPONENTS;
})(typeof window !== 'undefined' ? window : globalThis);
