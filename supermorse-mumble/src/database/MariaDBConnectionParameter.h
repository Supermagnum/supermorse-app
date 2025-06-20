// Copyright 2022 The Mumble Developers. All rights reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file at the root of the
// Mumble source tree or at <https://www.mumble.info/LICENSE>.

#ifndef MUMBLE_DATABASE_MARIADBCONNECTIONPARAMETER_H_
#define MUMBLE_DATABASE_MARIADBCONNECTIONPARAMETER_H_

#include "database/Backend.h"
#include "database/ConnectionParameter.h"

#include <string>

namespace mumble {
namespace db {

	class MariaDBConnectionParameter : public ConnectionParameter {
	public:
		MariaDBConnectionParameter(const std::string &dbName);

		std::string dbName;
		std::string userName = "";
		std::string password = "";
		std::string host     = "";
		std::string port     = "";

		virtual Backend applicability() const override;
	};

} // namespace db
} // namespace mumble

#endif // MUMBLE_DATABASE_MARIADBCONNECTIONPARAMETER_H_