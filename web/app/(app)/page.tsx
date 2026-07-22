import { FleetScreen } from '@/components/FleetScreen'

/**
 * The Fleet, which is still the product.
 *
 * The chrome that used to live here — skip link, header, connection — moved up into the
 * group's layout when the board stopped being the only screen, so that moving between
 * screens does not reconnect to the ground station.
 */
export default function Page() {
  return <FleetScreen />
}
