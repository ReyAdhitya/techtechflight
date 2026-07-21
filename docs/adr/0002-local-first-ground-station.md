# The dashboard runs locally, not in the cloud

The dashboard runs as a local ground station: a process on a laptop on the same network
as the drones, serving a browser UI. It is not deployed to the internet, and the drones
never talk to a cloud service.

This is a decision about the room, not about the technology. Our users are teachers in
schools, and school networks are locked down, client-isolated, and often have no usable
internet in the space where flying actually happens. A dashboard that needs the internet
to display a battery level is a dashboard that fails on lesson day. Running locally also
removes accounts, cloud cost, and any data-protection review of a product used around
minors.

## Considered options

Cloud-hosted (rejected: requires the drones to route to the internet through hostile
school networks, and fails without connectivity). Local-first with optional cloud sync
(deferred, not rejected — this is the likely path once there is a reason for it).

## Consequences

Distribution becomes the hard problem instead of connectivity. "Download and run this"
is a real barrier on managed school laptops, and we will eventually need to ship a
single double-clickable executable. We judged that a smaller problem than the product
not working in the building it was sold to.
